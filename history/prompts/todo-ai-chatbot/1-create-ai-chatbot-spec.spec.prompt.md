---
id: 1
title: Create AI Chatbot Spec
stage: spec
date: 2026-02-13
surface: agent
model: claude-opus-4-6
feature: todo-ai-chatbot
branch: 003-todo-ai-chatbot
user: user
command: /sp.specify
labels: ["spec", "chatbot", "mcp", "openai-agents", "phase-3"]
links:
  spec: specs/003-todo-ai-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-todo-ai-chatbot/spec.md
  - specs/003-todo-ai-chatbot/checklists/requirements.md
tests:
  - N/A
---

## Prompt

My front end and back end are ready, take a look at it and build it accordingly. /sp.specify Todo AI Chatbot using MCP and OpenAI Agents SDK

Target users: Individuals who want to manage daily tasks using natural language chat

Core objective:
Build a stateless AI chatbot that can create, update, list, complete, and delete todos through conversation.

Key features:
- Chat interface using OpenAI ChatKit
- FastAPI backend with endpoint:
  POST /api/{user_id}/chat
- Conversation persistence in PostgreSQL (Neon)
- OpenAI Agents SDK for AI logic
- MCP server exposing task tools:
  add_task
  list_tasks
  complete_task
  delete_task
  update_task
- Agent must use MCP tools only (no direct DB access)
- Stateless request cycle (history loaded from DB each time)
- Friendly confirmations after actions
- Graceful error handling

Database models:
- Task
- Conversation
- Message

Success criteria:
- User can manage todos via natural language
- Conversations resume after restart
- Correct MCP tool usage based on intent
- Multiple conversations per user supported
- System works without in-memory state

## Response snapshot

Created feature spec for Todo AI Chatbot (003-todo-ai-chatbot). Explored existing codebase — Phase 1 & 2 fully complete (FastAPI backend with User/Task models, Next.js frontend with auth, task CRUD). Phase 3 components (MCP server, OpenAI Agents SDK, ChatKit, Conversation/Message models) not yet implemented.

Spec includes 3 user stories:
- P1: Manage Tasks via Chat (6 acceptance scenarios covering all CRUD + conversational fallback)
- P2: Persistent Conversations (4 scenarios covering creation, persistence, restart survival, multi-conversation)
- P3: Chat Interface (4 scenarios covering UI display, send/receive, history, loading state)

12 functional requirements, 3 key entities, 6 measurable success criteria. All quality checklist items pass. No NEEDS CLARIFICATION markers — reasonable defaults documented in Assumptions section.

## Outcome

- ✅ Impact: Feature spec created, branch 003-todo-ai-chatbot checked out
- 🧪 Tests: N/A (specification phase)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.clarify or /sp.plan
- 🧠 Reflection: Thorough codebase exploration was essential — revealed existing Task model reuse, no auth needed for Phase 3, and clear boundary between existing CRUD API and new chat layer

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Checklist PASS (all items checked)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A
