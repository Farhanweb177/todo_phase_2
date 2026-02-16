"""OpenAI Agents SDK integration for the Todo chatbot.

Creates an Agent with MCP tools connected via stdio transport.
The MCP server runs as a subprocess for clean process isolation.
"""

import sys
from pathlib import Path

from agents import Agent, Runner
from agents.mcp import MCPServerStdio


# Path to the MCP server script
MCP_SERVER_PATH = str(Path(__file__).resolve().parent / "mcp_server.py")

SYSTEM_PROMPT_TEMPLATE = """You are a friendly Todo assistant. Help users manage their tasks through natural conversation.

When the user wants to:
- Add a task: use the add_task tool
- See their tasks: use the list_tasks tool
- Mark a task done: use the complete_task tool
- Remove a task: use the delete_task tool
- Change a task: use the update_task tool

Always include the user_id parameter: {user_id}

After performing an action, confirm what you did in a friendly way.
If the user's message doesn't relate to task management, respond conversationally and offer to help with tasks.

When listing tasks, format them clearly with status indicators.
When a task is not found, let the user know kindly."""


async def run_agent(user_id: str, messages: list[dict]) -> str:
    """Run the Todo Agent with MCP tools and conversation history.

    Args:
        user_id: The user's UUID string, injected into system prompt
        messages: List of message dicts with 'role' and 'content' keys

    Returns:
        The agent's text response
    """
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(user_id=user_id)

    async with MCPServerStdio(
        name="Todo Task Server",
        params={
            "command": sys.executable,
            "args": [MCP_SERVER_PATH],
        },
    ) as mcp_server:
        agent = Agent(
            name="Todo Assistant",
            instructions=system_prompt,
            mcp_servers=[mcp_server],
        )

        result = await Runner.run(agent, messages)
        return result.final_output
