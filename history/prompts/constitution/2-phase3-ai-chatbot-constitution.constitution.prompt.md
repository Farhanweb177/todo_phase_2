---
id: 2
title: Phase 3 AI Chatbot Constitution
stage: constitution
date: 2026-02-13
surface: agent
model: claude-opus-4-6
feature: none
branch: master
user: user
command: /sp.constitution
labels: ["constitution", "phase-3", "ai-chatbot", "mcp", "openai-agents"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - N/A
---

## Prompt

# SP Constitution – Phase 3: Todo AI Chatbot

## 1. Goal
Build a stateless AI Todo chatbot using:
FastAPI + OpenAI Agents SDK + MCP + Neon PostgreSQL + ChatKit.

---

## 2. Development Rules
- Follow Agentic workflow only:
  Spec → Plan → Tasks → Claude Code
- No manual coding outside generated tasks.

---

## 3. Stateless Requirement
Server must NOT store memory.
Each request must:
1. Fetch conversation from DB
2. Process message
3. Save response
System must work after restart.

---

## 4. Source of Truth
All data stored in Neon PostgreSQL:
- tasks
- conversations
- messages

No in-memory state.

---

## 5. Architecture Boundaries

### Frontend (ChatKit)
- Send/receive chat
- No business logic

### Backend (FastAPI)
Endpoint:
POST /api/{user_id}/chat

Responsibilities:
- Load history
- Run agent
- Save messages

### Agent (OpenAI Agents SDK)
- Cannot access DB directly
- Must use MCP tools only

### MCP Server
Required tools:
- add_task
- list_tasks
- complete_task
- delete_task
- update_task

## Response snapshot

Updated constitution from v1.1.0 to v2.0.0 (MAJOR bump). Key changes:
- Replaced "Deterministic Behavior" principle with "Stateless by Design"
- Removed "Security by Design" principle (no auth layer in Phase 3)
- Revised "Separation of Concerns" to four-layer architecture: ChatKit, FastAPI, OpenAI Agents SDK, MCP Server
- Revised "Production Realism" for MCP + Agents SDK stack
- Replaced Technical Constraints: Next.js → ChatKit, Better Auth → OpenAI Agents SDK + MCP
- Removed Security Constraints section entirely (no JWT/auth)
- Added Architecture Boundaries section with explicit layer definitions and MCP tool inventory
- Templates checked — all generic, no updates needed

## Outcome

- ✅ Impact: Constitution fully rewritten for Phase 3 AI Chatbot architecture
- 🧪 Tests: N/A (governance document)
- 📁 Files: .specify/memory/constitution.md
- 🔁 Next prompts: /sp.specify to create feature spec for the chatbot
- 🧠 Reflection: Major version bump justified by fundamental architecture change (auth removal, new agent/MCP layers)

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): N/A
