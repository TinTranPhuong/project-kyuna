"""
Coding Service — the full 9-agent coding pipeline runner.

Pipeline:
  1. Load session from DB
  2. Build file tree + active file context
  3. Reflector pre-flight check
  4. Orchestrator generates JSON plan
  5. For each step: reflector mid-check → dispatch agent → emit SSE
  6. Synthesizer produces user-facing summary
  7. Stream final tokens
"""
import json
import asyncio
import logging
from typing import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.agents.coding_agents import CODING_AGENT_REGISTRY
from app.services.agents.coding_agents.orchestrator import generate_coding_plan
from app.services.agents.coding_agents.reflector import run_reflection
from app.services.agents.coding_agents.synthesizer import run_synthesis
from app.services.file_tools import file_read, file_list

logger = logging.getLogger(__name__)


def _session_dir(user_id: str, session_id: str) -> Path:
    return Path(settings.UPLOAD_DIR) / "coding_sessions" / user_id / session_id


def _build_context(user_id: str, session_id: str, active_file: str, file_tree: dict, chat_history: list = None) -> str:
    """Build the context string injected into every agent."""
    lines = [f"Session ID: {session_id}"]
    lines.append(f"User ID: {user_id}")

    # Chat history
    if chat_history:
        lines.append("\n--- Recent Chat History ---")
        # Include the last 15 messages to provide conversation context
        for msg in chat_history[-15:]:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            lines.append(f"[{role.upper()}]: {content}")
        lines.append("---------------------------\n")

    # File list with sizes
    if file_tree:
        file_entries = []
        for path, meta in sorted(file_tree.items())[:80]:
            size = meta.get("size", 0) if isinstance(meta, dict) else 0
            lang = meta.get("lang", "?") if isinstance(meta, dict) else "?"
            file_entries.append(f"  {path} ({lang}, {size}B)")
        lines.append(f"Files ({len(file_tree)} total):")
        lines.extend(file_entries)
    else:
        lines.append("Files: (empty session)")

    # Active file content
    if active_file:
        file_path = _session_dir(user_id, session_id) / active_file
        if file_path.exists() and file_path.is_file():
            try:
                content = file_path.read_text(encoding="utf-8")
                lines.append(f"\n--- Active file: {active_file} ---")
                lines.append(f"```\n{content}\n```")
            except UnicodeDecodeError:
                lines.append(f"\nActive file: {active_file} (binary)")

    # Also include contents of small text files (first 5 files under 2KB)
    session_path = _session_dir(user_id, session_id)
    small_files_shown = 0
    for path, meta in sorted(file_tree.items()):
        if path == active_file:
            continue
        size = meta.get("size", 0) if isinstance(meta, dict) else 0
        if size > 2048 or small_files_shown >= 5:
            continue
        fp = session_path / path
        if fp.exists() and fp.is_file():
            try:
                content = fp.read_text(encoding="utf-8")
                lines.append(f"\n--- File: {path} ---")
                lines.append(f"```\n{content}\n```")
                small_files_shown += 1
            except (UnicodeDecodeError, Exception):
                pass

    return "\n".join(lines)


def _normalize_step(step: dict, fallback_message: str) -> tuple[str, str]:
    """
    Extract (agent_name, task) from a plan step regardless of field naming convention.
    Handles both orchestrator output formats:
      - { "agent_name": "...", "description": "..." }
      - { "agent": "...", "task": "..." }
    """
    agent_name = (
        step.get("agent_name") or
        step.get("agent") or
        step.get("name") or
        "analysis"
    )
    task = (
        step.get("description") or
        step.get("task") or
        step.get("desc") or
        fallback_message
    )
    return agent_name, task


async def run_coding_pipeline(
    db: AsyncSession,
    user_id: str,
    session_id: str,
    message: str,
    active_file: str = "",
) -> AsyncGenerator[str, None]:
    """
    Full coding pipeline execution as an SSE generator.
    Yields SSE-formatted strings: `data: {...}\n\n`
    """
    sse_queue = asyncio.Queue()

    try:
        # 1. Load session
        from app.models.coding_session import CodingSession
        from sqlalchemy.future import select
        from uuid import UUID

        result = await db.execute(
            select(CodingSession).where(
                CodingSession.id == UUID(session_id),
                CodingSession.user_id == UUID(user_id),
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            yield f"data: {json.dumps({'event': 'error', 'message': 'Session not found'})}\n\n"
            return

        file_tree = session.file_tree or {}

        # 2. Build context
        context = _build_context(user_id, session_id, active_file, file_tree, session.chat_history)

        yield f"data: {json.dumps({'event': 'pipeline_start'})}\n\n"

        # 3. Reflector pre-flight
        yield f"data: {json.dumps({'event': 'agent_start', 'agent': 'reflector (pre-flight)'})}\n\n"
        reflection = await run_reflection(
            plan_or_step=f"User request: {message}",
            context=context,
        )
        yield f"data: {json.dumps({'event': 'agent_end', 'agent': 'reflector (pre-flight)'})}\n\n"

        # 4. Orchestrator plan
        yield f"data: {json.dumps({'event': 'agent_start', 'agent': 'orchestrator'})}\n\n"
        plan = await generate_coding_plan(
            message=f"{message}\n\nReflector notes: {reflection}",
            context=context,
        )
        yield f"data: {json.dumps({'event': 'plan', 'steps': plan})}\n\n"
        yield f"data: {json.dumps({'event': 'agent_end', 'agent': 'orchestrator'})}\n\n"

        logger.info(f"[coding-pipeline] Plan ({len(plan)} steps): {json.dumps(plan)}")

        # 5. Execute each step
        agent_outputs = []
        for i, step in enumerate(plan):
            agent_name, task = _normalize_step(step, message)

            logger.info(f"[coding-pipeline] Step {i+1}: agent={agent_name}, task={task[:100]}")

            # Reflector mid-check (skip on first step since we did pre-flight)
            if i > 0:
                yield f"data: {json.dumps({'event': 'agent_start', 'agent': f'reflector (step {i+1})'})}\n\n"
                mid_reflection = await run_reflection(
                    plan_or_step=f"Step {i+1}: {agent_name} — {task}",
                    context=context + f"\n\nPrevious outputs:\n" + "\n---\n".join(agent_outputs[-2:]),
                )
                yield f"data: {json.dumps({'event': 'agent_end', 'agent': f'reflector (step {i+1})'})}\n\n"
                # Inject any warnings into the task
                if "warning" in mid_reflection.lower() or "issue" in mid_reflection.lower():
                    task = f"{task}\n\nReflector warning: {mid_reflection}"

            # Dispatch to specialist agent
            agent_fn = CODING_AGENT_REGISTRY.get(agent_name)
            if not agent_fn:
                logger.warning(f"[coding-pipeline] Unknown agent: {agent_name}, falling back to analysis")
                agent_fn = CODING_AGENT_REGISTRY["analysis"]

            yield f"data: {json.dumps({'event': 'step_start', 'step': i+1, 'agent': agent_name, 'task': task[:200]})}\n\n"

            # Collect SSE events from the agent
            agent_task = asyncio.create_task(
                agent_fn(task=task, context=context, user_id=user_id, session_id=session_id, sse_queue=sse_queue)
            )

            # Drain events from sse_queue while agent runs
            while not agent_task.done():
                try:
                    event = await asyncio.wait_for(sse_queue.get(), timeout=0.5)
                    yield f"data: {event}\n\n"
                except asyncio.TimeoutError:
                    continue

            agent_result = await agent_task

            # Drain remaining queue events
            while not sse_queue.empty():
                event = await sse_queue.get()
                yield f"data: {event}\n\n"

            agent_outputs.append(f"[{agent_name}]: {agent_result}")
            yield f"data: {json.dumps({'event': 'step_end', 'step': i+1, 'agent': agent_name})}\n\n"

            # Refresh context after file changes
            session_path = _session_dir(user_id, session_id)
            if session_path.exists():
                from app.routers.code_workspace import _build_file_tree
                file_tree = _build_file_tree(session_path)
                context = _build_context(user_id, session_id, active_file, file_tree, session.chat_history)

        # 6. Synthesizer
        yield f"data: {json.dumps({'event': 'agent_start', 'agent': 'synthesizer'})}\n\n"
        summary = await run_synthesis(agent_outputs=agent_outputs, context=context)
        yield f"data: {json.dumps({'event': 'agent_end', 'agent': 'synthesizer'})}\n\n"

        # Sync file_tree to DB so session list shows correct file counts
        try:
            from datetime import datetime, timezone
            await db.refresh(session)
            session.file_tree = file_tree
            session.last_active = datetime.now(timezone.utc)
            await db.commit()
        except Exception as db_err:
            logger.warning(f"[coding-pipeline] Failed to sync file_tree to DB: {db_err}")

        # 7. Stream final tokens
        for token in _chunk_text(summary, 20):
            yield f"data: {json.dumps({'event': 'token', 'content': token})}\n\n"

        yield f"data: {json.dumps({'event': 'agent_done'})}\n\n"

    except Exception as e:
        logger.error(f"[coding-pipeline] Pipeline error: {e}", exc_info=True)
        yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"


def _chunk_text(text: str, chunk_size: int = 20) -> list[str]:
    """Split text into small chunks for token-by-token streaming."""
    words = text.split(" ")
    chunks = []
    current = []
    for word in words:
        current.append(word)
        if len(current) >= chunk_size:
            chunks.append(" ".join(current) + " ")
            current = []
    if current:
        chunks.append(" ".join(current))
    return chunks
