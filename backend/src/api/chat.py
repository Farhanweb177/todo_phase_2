"""Chat API endpoint for the Todo AI Chatbot."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from ..agent import run_agent
from ..database.database import get_session
from ..services.chat_service import (
    get_conversation_messages,
    get_or_create_conversation,
    get_user_conversations,
    save_message,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: uuid.UUID


class ConversationRead(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    created_at: str
    updated_at: str


class MessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: str


@router.post("/{user_id}/chat", response_model=ChatResponse)
async def chat(
    user_id: uuid.UUID,
    request: ChatRequest,
    session: Session = Depends(get_session),
):
    """Send a chat message and receive an AI assistant response."""
    # Validate non-empty message
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Get or create conversation
    try:
        conversation = get_or_create_conversation(
            user_id=user_id,
            conversation_id=request.conversation_id,
            session=session,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Load existing message history
    existing_messages = get_conversation_messages(conversation.id, session)

    # Save user message to DB
    save_message(conversation.id, "user", request.message.strip(), session)

    # Build message list for agent (history + new message)
    agent_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in existing_messages
    ]
    agent_messages.append({"role": "user", "content": request.message.strip()})

    # Run the agent
    try:
        agent_response = await run_agent(
            user_id=str(user_id),
            messages=agent_messages,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An error occurred processing your request",
        )

    # Save assistant response to DB
    save_message(conversation.id, "assistant", agent_response, session)

    return ChatResponse(
        response=agent_response,
        conversation_id=conversation.id,
    )


@router.get(
    "/{user_id}/conversations",
    response_model=list[ConversationRead],
)
def list_conversations(
    user_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    """List all conversations for a user."""
    conversations = get_user_conversations(user_id, session)
    return [
        ConversationRead(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.get(
    "/{user_id}/conversations/{conversation_id}/messages",
    response_model=list[MessageRead],
)
def list_messages(
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    """List all messages in a conversation."""
    # Verify conversation belongs to user
    try:
        get_or_create_conversation(user_id, conversation_id, session)
    except ValueError:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = get_conversation_messages(conversation_id, session)
    return [
        MessageRead(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]
