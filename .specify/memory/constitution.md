<!--
Sync Impact Report:
- Version change: 1.1.0 → 2.0.0
- Modified principles:
  - "Security by Design" → REMOVED (no auth layer in Phase 3)
  - "Separation of Concerns" → revised to reflect ChatKit + FastAPI + Agent + MCP boundaries
  - "Production Realism" → revised to reflect MCP + OpenAI Agents SDK stack
  - "Spec-First Development" → KEPT (unchanged)
  - "No Manual Coding" → KEPT (unchanged)
  - "Deterministic Behavior" → replaced with "Stateless by Design"
- Added sections: Architecture Boundaries (Frontend, Backend, Agent, MCP Server)
- Removed sections: Security Constraints (JWT/Better Auth), auth-specific Technical Constraints
- Templates requiring updates:
  - ⚠ .specify/templates/plan-template.md (no changes needed — generic template)
  - ⚠ .specify/templates/spec-template.md (no changes needed — generic template)
  - ⚠ .specify/templates/tasks-template.md (no changes needed — generic template)
- Follow-up TODOs: None
-->
# Todo AI Chatbot Constitution

## Core Principles

### Spec-First Development
All implementation MUST strictly follow written specifications.
No code implementation before complete feature specification is
documented and approved. Every feature requirement MUST be
traceable to a written spec with acceptance criteria.

### No Manual Coding
All code MUST be generated via Claude Code agents. No hand-written
code patches or fixes allowed. All development MUST follow the
agentic workflow: Spec → Plan → Tasks → Claude Code.
Manual overrides are prohibited except for emergency rollbacks.

### Stateless by Design
The server MUST NOT store any in-memory state. Each request MUST:
1. Fetch conversation history from the database
2. Process the message via the agent
3. Save the response back to the database

The system MUST function correctly after a full restart with
zero data loss. No caches, no session stores, no globals.

### Separation of Concerns
Clear boundaries MUST be enforced between four layers:
- **Frontend (ChatKit)**: Send/receive chat messages only. No
  business logic.
- **Backend (FastAPI)**: Load history, run agent, save messages.
  Single endpoint: `POST /api/{user_id}/chat`.
- **Agent (OpenAI Agents SDK)**: Process user intent and invoke
  tools. MUST NOT access the database directly.
- **MCP Server**: Sole interface between agent and database.
  Exposes task CRUD operations as tools.

Services MUST communicate only via documented interfaces.
Cross-layer direct access is prohibited.

### Production Realism
Real database systems MUST be used from the start. API patterns
MUST follow industry standards. Secrets MUST be managed via
environment variables. The MCP tool interface MUST be the only
path for the agent to mutate data.

## Technical Constraints
- Frontend: ChatKit (chat UI)
- Backend: Python FastAPI
- Agent Framework: OpenAI Agents SDK
- Tool Protocol: Model Context Protocol (MCP)
- Database: Neon Serverless PostgreSQL
- API style: RESTful, JSON-only
- Backend MUST be stateless (no session or memory storage)
- Agent MUST use MCP tools exclusively for data access

## Architecture Boundaries

### Frontend (ChatKit)
- Send and receive chat messages
- No business logic
- No direct API calls to MCP or database

### Backend (FastAPI)
- Single endpoint: `POST /api/{user_id}/chat`
- Responsibilities:
  1. Load conversation history from database
  2. Run agent with conversation context
  3. Save assistant response to database
- MUST NOT hold state between requests

### Agent (OpenAI Agents SDK)
- Receives conversation history and user message
- Decides which MCP tools to call
- MUST NOT access the database directly
- MUST use MCP tools for all task operations

### MCP Server
- Required tools:
  - `add_task` — create a new task
  - `list_tasks` — retrieve all tasks for a user
  - `complete_task` — mark a task as done
  - `delete_task` — remove a task
  - `update_task` — modify a task
- All tools operate against Neon PostgreSQL
- Sole data-access layer for the agent

## Process Constraints
Workflow MUST strictly follow:
1. Write spec
2. Generate plan
3. Break into tasks
4. Implement via Claude Code

- No skipping steps
- No hand-written patches or fixes
- All iteration MUST follow the established workflow
- Environment variables used for all secrets and credentials

## Governance

This constitution supersedes all other development practices.
All development work MUST comply with these principles.
Amendments require explicit documentation, approval process,
and migration plan. All pull requests and reviews MUST verify
constitutional compliance.

**Version**: 2.0.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-13
