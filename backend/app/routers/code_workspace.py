"""
Code Workspace Router — REST + SSE endpoints for coding sessions.

Endpoints:
  POST   /sessions                      Create a new session
  GET    /sessions                      List user's sessions
  GET    /sessions/{session_id}         Get session + file tree
  POST   /sessions/{session_id}/upload  Upload files (multipart)
  GET    /sessions/{session_id}/files/{path:path}   Read a file
  PUT    /sessions/{session_id}/files/{path:path}   Write a file
  DELETE /sessions/{session_id}/files/{path:path}   Delete a file
  GET    /sessions/{session_id}/download            Download as .zip
  POST   /sessions/{session_id}/chat                SSE coding pipeline
  DELETE /sessions/{session_id}                     Delete session + files
"""
import io
import os
import json
import shutil
import logging
import zipfile
import mimetypes
from pathlib import Path
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.coding_session import CodingSession
from app.schemas.coding_session import (
    CodingSessionCreate, CodingSessionUpdate, CodingSessionResponse,
    CodingSessionListItem, ChatHistorySave
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

LANG_MAP = {
    ".py": "python", ".js": "javascript", ".ts": "typescript", ".tsx": "typescriptreact",
    ".jsx": "javascriptreact", ".html": "html", ".css": "css", ".scss": "scss",
    ".json": "json", ".md": "markdown", ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml", ".sql": "sql", ".sh": "shellscript", ".bash": "shellscript",
    ".rs": "rust", ".go": "go", ".java": "java", ".c": "c", ".cpp": "cpp",
    ".h": "c", ".hpp": "cpp", ".cs": "csharp", ".rb": "ruby", ".php": "php",
    ".swift": "swift", ".kt": "kotlin", ".dart": "dart", ".r": "r",
    ".xml": "xml", ".svg": "xml", ".txt": "plaintext", ".env": "plaintext",
    ".gitignore": "plaintext", ".dockerfile": "dockerfile",
}


def _session_dir(user_id: UUID, session_id: UUID) -> Path:
    return Path(settings.UPLOAD_DIR) / "coding_sessions" / str(user_id) / str(session_id)


def _detect_lang(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return LANG_MAP.get(ext, "plaintext")


def _build_file_tree(session_path: Path) -> dict:
    """Walk the session directory and build { relative_path: { size, lang } }."""
    tree = {}
    if not session_path.exists():
        return tree
    for fp in session_path.rglob("*"):
        if fp.is_file():
            rel = fp.relative_to(session_path).as_posix()
            tree[rel] = {"size": fp.stat().st_size, "lang": _detect_lang(fp.name)}
    return tree


async def _get_session(db: AsyncSession, session_id: UUID, user_id: UUID) -> CodingSession:
    result = await db.execute(
        select(CodingSession).where(CodingSession.id == session_id, CodingSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=CodingSessionResponse, status_code=201)
async def create_session(
    body: CodingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = CodingSession(user_id=current_user.id, title=body.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    # Create the directory on disk
    _session_dir(current_user.id, session.id).mkdir(parents=True, exist_ok=True)
    logger.info(f"[code-workspace] Created session {session.id} for user {current_user.id}")
    return session


@router.get("/sessions", response_model=list[CodingSessionListItem])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CodingSession)
        .where(CodingSession.user_id == current_user.id)
        .order_by(CodingSession.last_active.desc())
    )
    sessions = result.scalars().all()
    return [
        CodingSessionListItem(
            id=s.id, title=s.title,
            file_count=len(s.file_tree) if s.file_tree else 0,
            created_at=s.created_at, last_active=s.last_active,
        ) for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=CodingSessionResponse)
async def get_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    # Rebuild file tree from disk to stay in sync
    session_path = _session_dir(current_user.id, session_id)
    session.file_tree = _build_file_tree(session_path)
    await db.commit()
    return session


@router.post("/sessions/{session_id}/upload")
async def upload_files(
    session_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload files via multipart form. Each file's field name is the relative path."""
    session = await _get_session(db, session_id, current_user.id)
    session_path = _session_dir(current_user.id, session_id)
    session_path.mkdir(parents=True, exist_ok=True)

    form = await request.form()
    uploaded_count = 0

    for field_name in form:
        upload_file = form[field_name]
        if not hasattr(upload_file, "read"):
            continue

        # Use the field name as relative path, fallback to filename
        rel_path = field_name if "/" in field_name or "\\" in field_name else upload_file.filename
        if not rel_path:
            continue

        # Sanitize path (prevent directory traversal)
        rel_path = rel_path.replace("\\", "/").lstrip("/")
        if ".." in rel_path:
            continue

        file_path = session_path / rel_path
        file_path.parent.mkdir(parents=True, exist_ok=True)

        content = await upload_file.read()
        file_path.write_bytes(content)
        uploaded_count += 1

    # Rebuild file tree
    session.file_tree = _build_file_tree(session_path)
    session.last_active = datetime.now(timezone.utc)
    await db.commit()

    logger.info(f"[code-workspace] Uploaded {uploaded_count} files to session {session_id}")
    return {"uploaded": uploaded_count, "file_tree": session.file_tree}


@router.get("/sessions/{session_id}/files/{path:path}")
async def read_file(
    session_id: UUID,
    path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session(db, session_id, current_user.id)
    file_path = _session_dir(current_user.id, session_id) / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = f"[Binary file — {file_path.stat().st_size} bytes]"
    return {"path": path, "content": content, "lang": _detect_lang(path)}


@router.put("/sessions/{session_id}/files/{path:path}")
async def write_file(
    session_id: UUID,
    path: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    session_path = _session_dir(current_user.id, session_id)
    file_path = session_path / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(body.get("content", ""), encoding="utf-8")

    session.file_tree = _build_file_tree(session_path)
    session.last_active = datetime.now(timezone.utc)
    await db.commit()
    return {"path": path, "size": file_path.stat().st_size}


@router.delete("/sessions/{session_id}/files/{path:path}")
async def delete_file(
    session_id: UUID,
    path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    session_path = _session_dir(current_user.id, session_id)
    file_path = session_path / path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    if file_path.is_dir():
        shutil.rmtree(file_path)
    else:
        file_path.unlink()

    session.file_tree = _build_file_tree(session_path)
    session.last_active = datetime.now(timezone.utc)
    await db.commit()
    return {"deleted": path}


@router.get("/sessions/{session_id}/download")
async def download_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    session_path = _session_dir(current_user.id, session_id)
    if not session_path.exists():
        raise HTTPException(status_code=404, detail="No files in this session.")

    # Create zip in memory
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in session_path.rglob("*"):
            if fp.is_file():
                arcname = fp.relative_to(session_path).as_posix()
                zf.write(fp, arcname)
    buffer.seek(0)

    zip_filename = f"{session.title.replace(' ', '_')}.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    # Remove files from disk
    session_path = _session_dir(current_user.id, session_id)
    if session_path.exists():
        shutil.rmtree(session_path)
    await db.delete(session)
    await db.commit()
    logger.info(f"[code-workspace] Deleted session {session_id}")
    return {"deleted": str(session_id)}


@router.patch("/sessions/{session_id}", response_model=CodingSessionResponse)
async def rename_session(
    session_id: UUID,
    body: CodingSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a coding session."""
    session = await _get_session(db, session_id, current_user.id)
    session.title = body.title
    session.last_active = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    logger.info(f"[code-workspace] Renamed session {session_id} to '{body.title}'")
    return session


@router.get("/sessions/{session_id}/chat-history")
async def get_chat_history(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get stored chat history for the session."""
    session = await _get_session(db, session_id, current_user.id)
    return {"messages": session.chat_history or []}


@router.put("/sessions/{session_id}/chat-history")
async def save_chat_history(
    session_id: UUID,
    body: ChatHistorySave,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save chat history for the session (short-term memory)."""
    session = await _get_session(db, session_id, current_user.id)
    # Keep only last 50 messages to avoid bloat
    session.chat_history = body.messages[-50:]
    session.last_active = datetime.now(timezone.utc)
    await db.commit()
    return {"saved": len(session.chat_history)}


# ── SSE Chat endpoint (Phase 2 — placeholder, will wire to coding_service) ───

@router.post("/sessions/{session_id}/chat")
async def coding_chat(
    session_id: UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE endpoint that runs the coding pipeline."""
    session = await _get_session(db, session_id, current_user.id)
    message = body.get("message", "")
    active_file = body.get("active_file", "")

    from app.services.coding_service import run_coding_pipeline

    return StreamingResponse(
        run_coding_pipeline(
            db=db,
            user_id=str(current_user.id),
            session_id=str(session_id),
            message=message,
            active_file=active_file,
        ),
        media_type="text/event-stream",
    )
