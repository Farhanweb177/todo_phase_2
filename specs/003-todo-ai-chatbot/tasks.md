# Tasks: Todo AI Chatbot

**Input**: Design documents from `/specs/003-todo-ai-chatbot/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/chat-api.md

**Tests**: Not explicitly requested in spec. Tests are OMITTED.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new dependencies and environment configuration

- [x] T001 Add `openai-agents>=0.8.0` and `fastmcp>=2.0.0` to backend/requirements.txt and install them
- [x] T002 [P] Add OPENAI_API_KEY to backend/.env (placeholder value) and document it in backend/.env.example if it exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database models that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create Conversation model (id, user_id FK, title, created_at, updated_at) with User relationship in backend/src/models/conversation.py per data-model.md
- [x] T004 [P] Create Message model (id, conversation_id FK, role, content, created_at) with Conversation relationship in backend/src/models/message.py per data-model.md
- [x] T005 Register Conversation and Message model imports in backend/src/main.py `on_startup` so SQLModel creates tables automatically

**Checkpoint**: Foundation ready — new tables created on startup. User story implementation can begin.

---

## Phase 3: User Story 1 — Manage Tasks via Chat (Priority: P1) MVP

**Goal**: Users can create, list, complete, update, and delete tasks through natural language chat messages via a single API endpoint.

**Independent Test**: `curl -X POST http://localhost:8000/api/{user_id}/chat -H "Content-Type: application/json" -d '{"message": "Add buy groceries"}'` returns a friendly confirmation and the task appears in the database.

### Implementation for User Story 1

- [x] T006 [US1] Create MCP server in backend/src/mcp_server.py using FastMCP with 5 tools: `add_task(user_id, title, description)`, `list_tasks(user_id)`, `complete_task(user_id, task_id)`, `delete_task(user_id, task_id)`, `update_task(user_id, task_id, title, description)`. Each tool creates its own DB engine/session from DATABASE_URL env var, queries the existing Task table, and returns JSON dicts per contracts/chat-api.md. Script must be runnable standalone (`if __name__ == "__main__": mcp.run()`).
- [x] T007 [US1] Create chat service in backend/src/services/chat_service.py with functions: `get_or_create_conversation(user_id, conversation_id, session)` returns Conversation, `get_conversation_messages(conversation_id, session)` returns list of Message ordered by created_at, `save_message(conversation_id, role, content, session)` creates and returns Message.
- [x] T008 [US1] Create agent module in backend/src/agent.py with async function `run_agent(user_id: str, messages: list[dict]) -> str` that: creates MCPServerStdio pointing to backend/src/mcp_server.py, creates Agent with name "Todo Assistant", system prompt from plan.md (injecting user_id), mcp_servers=[server], runs via `Runner.run(agent, messages)`, and returns `result.final_output`.
- [x] T009 [US1] Create chat API endpoint in backend/src/api/chat.py: POST /api/{user_id}/chat accepting `ChatRequest(message: str, conversation_id: Optional[UUID])`, returning `ChatResponse(response: str, conversation_id: UUID)`. Flow: validate non-empty message, call chat_service to get/create conversation, load message history, save user message, call run_agent with history, save assistant response, return response + conversation_id. Include error handling per contracts/chat-api.md (400/404/500).
- [x] T010 [US1] Register chat router in backend/src/main.py by importing from `src.api.chat` and adding `app.include_router(chat.router, prefix="/api")`

**Checkpoint**: User Story 1 fully functional. Task CRUD works via natural language chat. Test with curl commands from quickstart.md.

---

## Phase 4: User Story 2 — Persistent Conversations (Priority: P2)

**Goal**: Users can list their conversations and retrieve message history for any conversation. Conversations persist across server restarts.

**Independent Test**: Send messages, restart server, verify conversation history loads correctly by calling the conversations list and messages endpoints.

### Implementation for User Story 2

- [x] T011 [US2] Add `get_user_conversations(user_id, session)` function to backend/src/services/chat_service.py that returns all conversations for a user ordered by updated_at descending
- [x] T012 [US2] Add GET /api/{user_id}/conversations endpoint to backend/src/api/chat.py that returns list of conversations (id, title, created_at, updated_at)
- [x] T013 [US2] Add GET /api/{user_id}/conversations/{conversation_id}/messages endpoint to backend/src/api/chat.py that returns all messages for a conversation (id, role, content, created_at)

**Checkpoint**: Users can list conversations, view history, and continue any prior conversation. Conversations survive server restart.

---

## Phase 5: User Story 3 — Chat Interface (Priority: P3)

**Goal**: Users access a web-based chat interface to send messages and see AI responses in a familiar messaging layout.

**Independent Test**: Navigate to /chat, send a message, see it appear in the thread with the bot's response below it.

### Implementation for User Story 3

- [x] T014 [P] [US3] Create chat API client in frontend/src/services/chat.ts with functions: `sendMessage(userId, message, conversationId?)` calling POST /api/{user_id}/chat, `getConversations(userId)` calling GET /api/{user_id}/conversations, `getMessages(userId, conversationId)` calling GET /api/{user_id}/conversations/{conversation_id}/messages. Use existing axios instance.
- [x] T015 [US3] Create ChatInterface component in frontend/src/components/ChatInterface.tsx: message list display (user messages right-aligned, assistant left-aligned), text input with send button, loading indicator while waiting for response, auto-scroll to latest message. Uses chat.ts service functions. Accepts userId prop.
- [x] T016 [US3] Create chat page in frontend/src/app/chat/page.tsx that renders ChatInterface component. Page loads conversations list on mount, allows selecting an existing conversation or starting a new one. Uses a hardcoded or URL-param userId for Phase 3 (no auth).

**Checkpoint**: Full end-to-end flow works: user types in browser, sees AI response, can manage tasks via natural language.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements across all user stories

- [x] T017 Verify CORS configuration in backend/src/main.py allows frontend origin for all new chat endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (requirements installed)
- **US1 (Phase 3)**: Depends on Phase 2 (models exist)
- **US2 (Phase 4)**: Depends on Phase 3 (chat service exists, endpoints exist)
- **US3 (Phase 5)**: Depends on Phase 3 (backend API must exist to call)
- **Polish (Phase 6)**: Depends on Phases 3-5

### User Story Dependencies

- **US1 (P1)**: BLOCKS US2 and US3. Must complete first.
- **US2 (P2)**: Can start after US1. Adds listing/history endpoints.
- **US3 (P3)**: Can start after US1. Can run in parallel with US2.

### Within Each User Story

- Models before services
- Services before endpoints
- MCP server before agent (US1)
- Agent before chat endpoint (US1)
- API client before UI components (US3)

### Parallel Opportunities

- T001 and T002 (setup tasks)
- T003 and T004 (Conversation and Message models — different files)
- T014 can start as soon as US1 is complete (parallel with US2)
- US2 (T011-T013) and US3 (T014-T016) can run in parallel after US1

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T010)
4. **STOP AND VALIDATE**: Test via curl — send chat messages, verify task CRUD works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test via curl → **MVP!** (tasks manageable via chat)
3. Add US2 → Test conversation listing → Deploy/Demo
4. Add US3 → Test in browser → Deploy/Demo (full product)
5. Polish → Final verification → Production

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Existing User and Task models are reused unchanged
- MCP server runs as subprocess (stdio) — needs its own DB connection
- Agent system prompt must inject user_id for MCP tool scoping
- No JWT auth for chat endpoint — user_id from URL path
- Total: 17 tasks across 6 phases
