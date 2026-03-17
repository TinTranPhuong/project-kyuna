"""
7 file operation tools for the coding pipeline.
All scoped to session_id + user_id — agents cannot access files outside their session.
"""
import os
import re
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)


def _session_path(user_id: str, session_id: str) -> Path:
    return Path(settings.UPLOAD_DIR) / "coding_sessions" / user_id / session_id


async def file_read(user_id: str, session_id: str, path: str) -> str:
    """Read file content from the session."""
    fp = _session_path(user_id, session_id) / path
    if not fp.exists() or not fp.is_file():
        return f"Error: File not found — {path}"
    try:
        return fp.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return f"[Binary file — {fp.stat().st_size} bytes]"


async def file_write(user_id: str, session_id: str, path: str, content: str) -> str:
    """Write/overwrite a file in the session. Returns confirmation."""
    fp = _session_path(user_id, session_id) / path
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(content, encoding="utf-8")
    return f"Written {len(content)} chars to {path}"


async def file_create(user_id: str, session_id: str, path: str, content: str = "") -> str:
    """Create a new file in the session."""
    fp = _session_path(user_id, session_id) / path
    if fp.exists():
        return f"Error: File already exists — {path}. Use file_write to overwrite."
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(content, encoding="utf-8")
    return f"Created {path}"


async def file_delete(user_id: str, session_id: str, path: str) -> str:
    """Delete a file from the session. HITL — requires user confirmation."""
    fp = _session_path(user_id, session_id) / path
    if not fp.exists():
        return f"Error: File not found — {path}"
    if fp.is_dir():
        import shutil
        shutil.rmtree(fp)
    else:
        fp.unlink()
    return f"Deleted {path}"


async def file_list(user_id: str, session_id: str) -> str:
    """List full file tree with metadata."""
    base = _session_path(user_id, session_id)
    if not base.exists():
        return "Empty session — no files."
    lines = []
    for fp in sorted(base.rglob("*")):
        if fp.is_file():
            rel = fp.relative_to(base).as_posix()
            size = fp.stat().st_size
            lines.append(f"  {rel}  ({size} bytes)")
    if not lines:
        return "Empty session — no files."
    return "Files:\n" + "\n".join(lines)


async def file_rename(user_id: str, session_id: str, old_path: str, new_path: str) -> str:
    """Rename a file or directory."""
    base = _session_path(user_id, session_id)
    src = base / old_path
    dst = base / new_path
    if not src.exists():
        return f"Error: {old_path} not found."
    if dst.exists():
        return f"Error: {new_path} already exists."
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    return f"Renamed {old_path} → {new_path}"


async def file_search(user_id: str, session_id: str, query: str) -> str:
    """Grep-style search across all session files. Returns matching lines."""
    base = _session_path(user_id, session_id)
    if not base.exists():
        return "No files in session."
    matches = []
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    for fp in base.rglob("*"):
        if not fp.is_file():
            continue
        try:
            text = fp.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if pattern.search(line):
                rel = fp.relative_to(base).as_posix()
                matches.append(f"  {rel}:{i}: {line.strip()}")
                if len(matches) >= 50:
                    matches.append("  ... (truncated at 50 results)")
                    return "Search results:\n" + "\n".join(matches)
    if not matches:
        return f"No matches for '{query}'."
    return "Search results:\n" + "\n".join(matches)
