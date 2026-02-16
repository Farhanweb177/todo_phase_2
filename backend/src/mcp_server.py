"""MCP Server for Todo task management.

Standalone script that exposes task CRUD tools via FastMCP.
Runs as a subprocess (stdio transport) invoked by the OpenAI Agent.
Creates its own DB engine/session (subprocess isolation).
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastmcp import FastMCP
from sqlmodel import Session, create_engine, select

# Load .env from the backend root directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path, override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todo_app.db")

connect_args = {}
if "neon.tech" in DATABASE_URL:
    connect_args = {"sslmode": "require"}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

# Import Task model after engine setup to avoid circular issues
# We import the class directly to keep this script self-contained
from sqlmodel import SQLModel, Field, Relationship  # noqa: E402


class TaskTable(SQLModel, table=True):
    """Mirror of the Task model for subprocess isolation."""
    __tablename__ = "task"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    description: Optional[str] = None
    completed: bool = False
    user_id: uuid.UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


mcp = FastMCP(name="Todo Task Server")


def _task_to_dict(task: TaskTable) -> dict:
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description or "",
        "completed": task.completed,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


@mcp.tool
def add_task(user_id: str, title: str, description: str = "") -> str:
    """Create a new task for the user.

    Args:
        user_id: The user's UUID
        title: The task title
        description: Optional task description
    """
    with Session(engine) as session:
        task = TaskTable(
            title=title,
            description=description if description else None,
            user_id=uuid.UUID(user_id),
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return json.dumps(_task_to_dict(task))


@mcp.tool
def list_tasks(user_id: str) -> str:
    """List all tasks for a user.

    Args:
        user_id: The user's UUID
    """
    with Session(engine) as session:
        statement = select(TaskTable).where(
            TaskTable.user_id == uuid.UUID(user_id)
        )
        tasks = session.exec(statement).all()
        result = {
            "tasks": [_task_to_dict(t) for t in tasks],
            "total": len(tasks),
        }
        return json.dumps(result)


@mcp.tool
def complete_task(user_id: str, task_id: str) -> str:
    """Mark a task as completed.

    Args:
        user_id: The user's UUID
        task_id: The task's UUID to complete
    """
    with Session(engine) as session:
        statement = select(TaskTable).where(
            TaskTable.id == uuid.UUID(task_id),
            TaskTable.user_id == uuid.UUID(user_id),
        )
        task = session.exec(statement).first()
        if not task:
            return json.dumps({"error": "Task not found"})
        task.completed = True
        task.updated_at = datetime.utcnow()
        session.add(task)
        session.commit()
        session.refresh(task)
        return json.dumps(_task_to_dict(task))


@mcp.tool
def delete_task(user_id: str, task_id: str) -> str:
    """Delete a task.

    Args:
        user_id: The user's UUID
        task_id: The task's UUID to delete
    """
    with Session(engine) as session:
        statement = select(TaskTable).where(
            TaskTable.id == uuid.UUID(task_id),
            TaskTable.user_id == uuid.UUID(user_id),
        )
        task = session.exec(statement).first()
        if not task:
            return json.dumps({"error": "Task not found"})
        task_id_str = str(task.id)
        session.delete(task)
        session.commit()
        return json.dumps({"deleted": True, "task_id": task_id_str})


@mcp.tool
def update_task(
    user_id: str,
    task_id: str,
    title: str = "",
    description: str = "",
) -> str:
    """Update a task's title or description.

    Args:
        user_id: The user's UUID
        task_id: The task's UUID to update
        title: New title (empty string means no change)
        description: New description (empty string means no change)
    """
    with Session(engine) as session:
        statement = select(TaskTable).where(
            TaskTable.id == uuid.UUID(task_id),
            TaskTable.user_id == uuid.UUID(user_id),
        )
        task = session.exec(statement).first()
        if not task:
            return json.dumps({"error": "Task not found"})
        if title:
            task.title = title
        if description:
            task.description = description
        task.updated_at = datetime.utcnow()
        session.add(task)
        session.commit()
        session.refresh(task)
        return json.dumps(_task_to_dict(task))


if __name__ == "__main__":
    mcp.run()
