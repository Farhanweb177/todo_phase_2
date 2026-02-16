# Implementation Plan: Todo AI Chatbot

**Branch**: `003-todo-ai-chatbot` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-todo-ai-chatbot/spec.md`

## Summary

Build a stateless AI-powered Todo chatbot that enables users to
manage tasks through natural language conversation. The backend
uses FastAPI with OpenAI Agents SDK for AI reasoning and an MCP
server (via FastMCP + stdio transport) as the sole data-access
layer for task CRUD operations. Conversations and messages are
persisted in Neon PostgreSQL. The frontend extends the existing
Next.js app with a chat page.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5+ (frontend)
**Primary Dependencies**: FastAPI 0.115, OpenAI Agents SDK 0.8+,
FastMCP 2.0+, SQLModel 0.0.32, Next.js 16, React 19
**Storage**: Neon Serverless PostgreSQL (existing)
**Testing**: pytest (backend), Jest (frontend)
**Target Platform**: Linux/Windows server (backend), Web browser (frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: <10s response time per chat message
**Constraints**: Fully stateless backend, no in-memory state
**Scale/Scope**: Single-user to small team usage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Spec-First Development**: Feature spec completed and approved
  before this plan. All requirements traceable to spec.md.
- [x] **No Manual Coding**: All implementation will be generated via
  Claude Code agents following task breakdowns.
- [x] **Stateless by Design**: Each request loads history from DB,
  processes via agent, saves response. No in-memory state.
  Verified in request flow design.
- [x] **Separation of Concerns**: Four-layer architecture enforced:
  - Frontend: chat UI only (no business logic)
  - Backend (FastAPI): orchestration (load/save/run)
  - Agent (OpenAI Agents SDK): intent + tool selection
  - MCP Server: sole DB access for agent
- [x] **Production Realism**: Neon PostgreSQL from start. Secrets
  via environment variables. MCP is only data path.

## Project Structure

### Documentation (this feature)

```text
specs/003-todo-ai-chatbot/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── chat-api.md      # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/sp.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── user.py            # existing
│   │   ├── task.py            # existing
│   │   ├── conversation.py    # NEW
│   │   └── message.py         # NEW
│   ├── services/
│   │   ├── auth_service.py    # existing
│   │   ├── task_service.py    # existing
│   │   └── chat_service.py    # NEW — conversation/message CRUD
│   ├── api/
│   │   ├── auth.py            # existing
│   │   ├── tasks.py           # existing
│   │   └── chat.py            # NEW — POST /api/{user_id}/chat
│   ├── database/
│   │   └── database.py        # existing (shared engine/session)
│   ├── mcp_server.py          # NEW — MCP tools via FastMCP
│   ├── agent.py               # NEW — Agent creation + runner
│   └── main.py                # MODIFIED — register chat router
├── requirements.txt           # MODIFIED — add openai-agents, fastmcp
├── .env                       # MODIFIED — add OPENAI_API_KEY
└── tests/

frontend/
├── src/
│   ├── app/
│   │   └── chat/
│   │       └── page.tsx       # NEW — chat page
│   ├── components/
│   │   └── ChatInterface.tsx  # NEW — chat UI component
│   └── services/
│       └── chat.ts            # NEW — chat API client
└── package.json               # existing (no new deps needed)
```

**Structure Decision**: Web application pattern (Option 2). Extends
existing `backend/` and `frontend/` directories. New files added
within existing module structure. No new top-level directories.

## Phase 0: Research Findings

See [research.md](research.md) for full details. Key decisions:

1. **Agent**: OpenAI Agents SDK with `MCPServerStdio` transport
2. **MCP Server**: FastMCP with `@mcp.tool` decorators, run as
   subprocess via stdio
3. **Conversation storage**: Manual PostgreSQL persistence
   (Conversation + Message models), loaded per request
4. **Frontend**: Custom React chat component (simpler than full
   ChatKit protocol integration)
5. **user_id scoping**: Passed as explicit parameter to each MCP tool
6. **New deps**: `openai-agents>=0.8.0`, `fastmcp>=2.0.0`

## Phase 1: Design

### Data Model

See [data-model.md](data-model.md). Two new tables:

- **Conversation**: id, user_id (FK), title, created_at, updated_at
- **Message**: id, conversation_id (FK), role, content, created_at

Existing User and Task tables unchanged.

### API Contracts

See [contracts/chat-api.md](contracts/chat-api.md).

**HTTP Endpoint**:
- `POST /api/{user_id}/chat` — send message, get AI response

**MCP Tools** (internal, not HTTP):
- `add_task(user_id, title, description?)`
- `list_tasks(user_id)`
- `complete_task(user_id, task_id)`
- `delete_task(user_id, task_id)`
- `update_task(user_id, task_id, title?, description?)`

### Architecture Flow

```text
1. Frontend sends POST /api/{user_id}/chat
   Body: { message, conversation_id? }

2. FastAPI chat endpoint:
   a. Validate message is non-empty
   b. Load or create conversation
   c. Load conversation messages from DB
   d. Save user message to DB
   e. Build agent input: message history list
   f. Start MCP server subprocess
   g. Create Agent with MCP tools + system prompt
   h. Run Agent with message history + user context
   i. Save assistant response to DB
   j. Return { response, conversation_id }

3. MCP Server (subprocess):
   - Receives tool calls from Agent
   - Creates own DB session (separate process)
   - Executes task CRUD against PostgreSQL
   - Returns structured JSON to Agent

4. Agent (OpenAI Agents SDK):
   - Receives conversation history
   - Determines user intent
   - Calls appropriate MCP tool(s)
   - Generates friendly confirmation response
```

### Agent System Prompt

```text
You are a friendly Todo assistant. Help users manage their tasks
through natural conversation.

When the user wants to:
- Add a task: use the add_task tool
- See their tasks: use the list_tasks tool
- Mark a task done: use the complete_task tool
- Remove a task: use the delete_task tool
- Change a task: use the update_task tool

Always include the user_id parameter: {user_id}

After performing an action, confirm what you did in a friendly way.
If the user's message doesn't relate to task management, respond
conversationally and offer to help with tasks.

When listing tasks, format them clearly with status indicators.
When a task is not found, let the user know kindly.
```

### MCP Server Design

File: `backend/src/mcp_server.py`

- Standalone Python script using FastMCP
- Creates its own SQLModel engine + session (subprocess isolation)
- Loads DATABASE_URL from environment
- Defines 5 tools with typed parameters
- Each tool accepts `user_id` as first parameter
- Returns JSON-serializable dicts
- Run via: `python -m src.mcp_server` (or direct path)

### Chat Service Design

File: `backend/src/services/chat_service.py`

Functions:
- `get_or_create_conversation(user_id, conversation_id, session)`
- `get_conversation_messages(conversation_id, session)`
- `save_message(conversation_id, role, content, session)`

### Frontend Chat Page Design

File: `frontend/src/app/chat/page.tsx`

- Simple chat interface with message list + input
- Sends POST requests to `/api/{user_id}/chat`
- Displays user and assistant messages in bubbles
- Shows loading indicator during agent processing
- Stores conversation_id in component state
- Uses existing axios API client from `services/api.ts`

## Complexity Tracking

No constitution violations. All constraints satisfied:

| Requirement | Status |
|-------------|--------|
| Stateless backend | Satisfied — DB load/save per request |
| MCP-only data access | Satisfied — agent uses MCP tools |
| Four-layer separation | Satisfied — ChatUI / FastAPI / Agent / MCP |
| No in-memory state | Satisfied — no globals, caches, or sessions |
| Environment secrets | Satisfied — OPENAI_API_KEY in .env |
