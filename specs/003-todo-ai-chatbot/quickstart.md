# Quickstart: Todo AI Chatbot

**Feature**: 003-todo-ai-chatbot
**Date**: 2026-02-13

## Prerequisites

- Python 3.11+
- Node.js 18+
- Neon PostgreSQL database (existing from Phase 1/2)
- OpenAI API key

## 1. Backend Setup

```bash
cd backend

# Install new dependencies
pip install -r requirements.txt

# Add to .env file
OPENAI_API_KEY=sk-your-openai-api-key
```

New dependencies added to `requirements.txt`:
```
openai-agents>=0.8.0
fastmcp>=2.0.0
```

## 2. Database Migration

Tables are auto-created by SQLModel on startup. New tables:
- `conversation` (id, user_id, title, created_at, updated_at)
- `message` (id, conversation_id, role, content, created_at)

## 3. Start Backend

```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 5. Test the Chat Endpoint

```bash
# Create a chat message (replace USER_ID with a valid user UUID)
curl -X POST http://localhost:8000/api/{USER_ID}/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Add buy groceries to my list"}'

# Expected response:
# {
#   "response": "I've added 'buy groceries' to your task list!",
#   "conversation_id": "uuid"
# }

# Continue the conversation
curl -X POST http://localhost:8000/api/{USER_ID}/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show my tasks", "conversation_id": "uuid"}'
```

## 6. Verify Stateless Behavior

1. Send a few chat messages to create tasks
2. Stop the backend server (Ctrl+C)
3. Restart the backend server
4. Send another message to the same conversation_id
5. Verify the chatbot remembers all previous messages

## Architecture Overview

```text
Frontend (Chat UI)
    │
    ▼
FastAPI (POST /api/{user_id}/chat)
    │
    ├── Load conversation history from DB
    ├── Save user message to DB
    │
    ▼
OpenAI Agents SDK (Agent)
    │
    ▼
MCP Server (stdio subprocess)
    │
    ├── add_task
    ├── list_tasks
    ├── complete_task
    ├── delete_task
    └── update_task
         │
         ▼
    Neon PostgreSQL
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | yes | Neon PostgreSQL connection string |
| OPENAI_API_KEY | yes | OpenAI API key for agent |
| SECRET_KEY | yes | App secret (existing) |
