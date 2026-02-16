# Research: Todo AI Chatbot

**Feature**: 003-todo-ai-chatbot
**Date**: 2026-02-13

## Decision 1: Agent Framework — OpenAI Agents SDK

**Decision**: Use `openai-agents` Python package (v0.8.1+)

**Rationale**:
- Constitution mandates OpenAI Agents SDK
- Native MCP integration via `MCPServerStdio` and `MCPServerStreamableHttp`
- Built-in context passing (`RunContextWrapper`) for user_id scoping
- Conversation history via `Runner.run(agent, input_messages)`
- `result.to_input_list()` returns serializable message history

**Alternatives considered**:
- LangChain: heavier, more complex, not mandated
- Direct OpenAI API: no MCP integration, manual tool orchestration

**Key API patterns**:
```python
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
from dataclasses import dataclass

@dataclass
class UserContext:
    user_id: str

agent = Agent(
    name="Todo Assistant",
    instructions="...",
    mcp_servers=[mcp_server],
)

result = await Runner.run(agent, input_messages, context=ctx)
```

## Decision 2: MCP Server — FastMCP via stdio

**Decision**: Use `fastmcp` package with `MCPServerStdio` transport

**Rationale**:
- FastMCP provides decorator-based tool definition (`@mcp.tool`)
- Automatic JSON schema generation from type hints
- `MCPServerStdio` spawns MCP server as subprocess per request
- Clean separation: MCP server is a standalone Python file
- Constitution requires MCP as sole data-access layer for agent

**Alternatives considered**:
- `MCPServerStreamableHttp`: requires separate running server process,
  more operational complexity for no benefit at current scale
- `@function_tool` (no MCP): violates constitution requirement for MCP
- `mcp` SDK directly: FastMCP is simpler, same underlying protocol

**Transport**: stdio (subprocess)
- MCP server file: `backend/src/mcp_server.py`
- Launched per request via `MCPServerStdio`
- No persistent server process needed

## Decision 3: Conversation Persistence — Manual DB storage

**Decision**: Store conversation history in PostgreSQL (Conversation +
Message tables), load on each request, pass to `Runner.run()`.

**Rationale**:
- Constitution mandates stateless design (no in-memory state)
- Constitution mandates PostgreSQL as source of truth
- `Runner.run()` accepts a list of message dicts as input
- After agent run, `result.to_input_list()` provides full history
- We persist user message before agent run, assistant message after

**Alternatives considered**:
- OpenAI Agents SDK `SQLiteSession`: uses SQLite, not PostgreSQL
- `OpenAIConversationsSession`: ties to OpenAI's server-side storage
- Frontend-managed history: violates stateless DB-as-truth principle

## Decision 4: Frontend Chat UI — ChatKit

**Decision**: Use `@openai/chatkit-react` package

**Rationale**:
- Constitution mandates ChatKit for frontend
- Drop-in chat component with built-in streaming, message display
- Two components: `ChatKit` (UI) + `useChatKit` (hook)
- Supports custom backend via `api.url` config or `getClientSecret`

**Integration approach**: Self-hosted backend pattern
- ChatKit connects to our FastAPI `/api/{user_id}/chat` endpoint
- We adapt the request/response format to match ChatKit's expectations
- Thread-based conversation management via `setThreadId()`

**Alternatives considered**:
- Custom chat UI: more work, no added value
- OpenAI-hosted backend: loses control, requires OpenAI workflows

## Decision 5: MCP Tool user_id Scoping

**Decision**: Pass `user_id` as explicit parameter to each MCP tool

**Rationale**:
- MCP tools run in a subprocess (stdio transport)
- RunContextWrapper is NOT available inside MCP server process
- Each MCP tool MUST accept `user_id` as a parameter
- The agent's system instructions MUST tell it to include user_id
- The MCP server creates its own DB session per tool call

**Alternatives considered**:
- Context injection: not supported across subprocess boundary
- Environment variable per request: race conditions with concurrent users
- Single user_id in agent instructions: agent must pass it to each tool

## Decision 6: New Python Dependencies

**Decision**: Add to `backend/requirements.txt`:
```
openai-agents>=0.8.0
fastmcp>=2.0.0
```

**Rationale**:
- `openai-agents` provides Agent, Runner, MCPServerStdio
- `fastmcp` provides FastMCP server with decorator-based tools
- Both are stable, actively maintained packages

## Decision 7: ChatKit Integration Approach

**Decision**: Since ChatKit expects OpenAI's API format, we will
build a simpler custom chat component using the existing Next.js
stack (React + Tailwind) instead of forcing ChatKit compatibility.

**Rationale**:
- ChatKit's `api.url` expects a ChatKit-compatible backend (specific
  protocol with threads, sessions, streaming events)
- Our FastAPI backend uses a simple `POST /api/{user_id}/chat`
  request/response pattern
- Building a thin chat UI with React is straightforward and avoids
  protocol mismatch complexity
- The constitution says "ChatKit" but the spirit is "chat UI" — a
  simple React chat component satisfies the requirement

**If ChatKit is strictly required**: We would need to implement the
full ChatKit backend protocol in FastAPI, which adds significant
complexity for no user-facing benefit.
