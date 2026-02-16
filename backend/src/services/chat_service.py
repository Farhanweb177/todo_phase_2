"""Chat service for conversation and message management."""

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from ..models.conversation import Conversation
from ..models.message import Message


def get_or_create_conversation(
    user_id: uuid.UUID,
    conversation_id: Optional[uuid.UUID],
    session: Session,
) -> Conversation:
    """Load an existing conversation or create a new one.

    Args:
        user_id: The user's UUID
        conversation_id: Optional existing conversation UUID
        session: Database session

    Returns:
        Conversation instance

    Raises:
        ValueError: If conversation_id is provided but not found
    """
    if conversation_id:
        statement = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        conversation = session.exec(statement).first()
        if not conversation:
            raise ValueError("Conversation not found")
        return conversation

    # Create new conversation
    conversation = Conversation(user_id=user_id)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def get_conversation_messages(
    conversation_id: uuid.UUID,
    session: Session,
) -> list[Message]:
    """Load all messages for a conversation, ordered chronologically.

    Args:
        conversation_id: The conversation UUID
        session: Database session

    Returns:
        List of Message instances ordered by created_at ascending
    """
    statement = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)  # type: ignore
    )
    return list(session.exec(statement).all())


def save_message(
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    session: Session,
) -> Message:
    """Save a message to a conversation.

    Args:
        conversation_id: The conversation UUID
        role: "user" or "assistant"
        content: Message text
        session: Database session

    Returns:
        Created Message instance
    """
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    session.add(message)

    # Update conversation's updated_at timestamp
    statement = select(Conversation).where(
        Conversation.id == conversation_id
    )
    conversation = session.exec(statement).first()
    if conversation:
        conversation.updated_at = datetime.utcnow()
        session.add(conversation)

    session.commit()
    session.refresh(message)
    return message


def get_user_conversations(
    user_id: uuid.UUID,
    session: Session,
) -> list[Conversation]:
    """Get all conversations for a user, ordered by most recent first.

    Args:
        user_id: The user's UUID
        session: Database session

    Returns:
        List of Conversation instances ordered by updated_at descending
    """
    statement = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())  # type: ignore
    )
    return list(session.exec(statement).all())
