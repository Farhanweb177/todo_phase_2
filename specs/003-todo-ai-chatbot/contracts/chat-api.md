# API Contract: Chat Endpoint

**Feature**: 003-todo-ai-chatbot
**Date**: 2026-02-13

## POST /api/{user_id}/chat

Send a chat message and receive an AI assistant response.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | UUID | yes | The user's unique identifier |

### Request Body

```json
{
  "message": "Add buy groceries to my list",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | yes | The user's chat message (non-empty) |
| conversation_id | UUID | no | Existing conversation ID. If omitted, a new conversation is created. |

### Success Response (200 OK)

```json
{
  "response": "I've added 'buy groceries' to your task list!",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| response | string | The assistant's reply |
| conversation_id | UUID | The conversation ID (new or existing) |

### Error Responses

**400 Bad Request** — Empty or missing message
```json
{
  "detail": "Message cannot be empty"
}
```

**404 Not Found** — Invalid conversation_id
```json
{
  "detail": "Conversation not found"
}
```

**500 Internal Server Error** — Agent or MCP failure
```json
{
  "detail": "An error occurred processing your request"
}
```

### Request Flow

1. Validate `message` is non-empty
2. If `conversation_id` provided, load existing conversation
3. If `conversation_id` not provided, create new conversation
4. Load all messages for the conversation from DB
5. Save user message to DB
6. Build message list for agent (conversation history + new message)
7. Run OpenAI Agent with MCP tools and message list
8. Save assistant response to DB
9. Return response and conversation_id

---

## MCP Tool Contracts

These tools are exposed by the MCP server and called by the
OpenAI Agent. They are NOT HTTP endpoints.

### add_task

```
Parameters:
  user_id: str (UUID) — required
  title: str — required
  description: str — optional, default ""

Returns: JSON
  {
    "id": "uuid",
    "title": "buy groceries",
    "description": "",
    "completed": false,
    "created_at": "2026-02-13T10:00:00Z"
  }
```

### list_tasks

```
Parameters:
  user_id: str (UUID) — required

Returns: JSON
  {
    "tasks": [
      {
        "id": "uuid",
        "title": "buy groceries",
        "completed": false,
        "created_at": "2026-02-13T10:00:00Z"
      }
    ],
    "total": 1
  }
```

### complete_task

```
Parameters:
  user_id: str (UUID) — required
  task_id: str (UUID) — required

Returns: JSON
  {
    "id": "uuid",
    "title": "buy groceries",
    "completed": true,
    "updated_at": "2026-02-13T11:00:00Z"
  }

Error: {"error": "Task not found"}
```

### delete_task

```
Parameters:
  user_id: str (UUID) — required
  task_id: str (UUID) — required

Returns: JSON
  {"deleted": true, "task_id": "uuid"}

Error: {"error": "Task not found"}
```

### update_task

```
Parameters:
  user_id: str (UUID) — required
  task_id: str (UUID) — required
  title: str — optional
  description: str — optional

Returns: JSON
  {
    "id": "uuid",
    "title": "updated title",
    "description": "updated description",
    "completed": false,
    "updated_at": "2026-02-13T11:00:00Z"
  }

Error: {"error": "Task not found"}
```
