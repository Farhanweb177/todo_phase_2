# Data Model: Todo AI Chatbot

**Feature**: 003-todo-ai-chatbot
**Date**: 2026-02-13

## Existing Entities (no changes)

### User
Already exists at `backend/src/models/user.py`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| email | str | unique, indexed |
| username | str | unique, indexed |
| hashed_password | str | required |
| first_name | str | optional |
| last_name | str | optional |
| created_at | datetime | auto |
| updated_at | datetime | auto |

### Task
Already exists at `backend/src/models/task.py`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| title | str | required |
| description | str | optional |
| completed | bool | default False |
| user_id | UUID | FK → user.id |
| created_at | datetime | auto |
| updated_at | datetime | auto |

## New Entities

### Conversation
New model at `backend/src/models/conversation.py`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → user.id, indexed |
| title | str | optional, auto-generated from first message |
| created_at | datetime | auto |
| updated_at | datetime | auto |

**Relationships**:
- Belongs to User (many conversations per user)
- Has many Messages (ordered by created_at)

### Message
New model at `backend/src/models/message.py`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK, auto-generated |
| conversation_id | UUID | FK → conversation.id, indexed |
| role | str | required, one of: "user", "assistant" |
| content | str | required |
| created_at | datetime | auto |

**Relationships**:
- Belongs to Conversation (many messages per conversation)
- Ordered chronologically within conversation

## Entity Relationship Diagram

```text
User (existing)
 ├── has many → Task (existing)
 └── has many → Conversation (new)
                  └── has many → Message (new)
```

## Validation Rules

- **Conversation.user_id**: MUST reference an existing user
- **Message.role**: MUST be "user" or "assistant"
- **Message.content**: MUST NOT be empty
- **Message ordering**: Always by `created_at` ascending within
  a conversation

## State Transitions

- **Conversation**: Created on first message from user. No explicit
  close/archive state. Updated timestamp refreshed on each new
  message.
- **Message**: Immutable after creation. No updates or deletes.
- **Task** (via MCP): Standard CRUD. `completed` toggled by
  `complete_task` tool.
