"""Pydantic schemas for the Code Workspace feature."""
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ── Request Schemas ───────────────────────────────────────────────────────────

class CodingSessionCreate(BaseModel):
    title: str = Field("Untitled Project", max_length=255)


class CodingSessionUpdate(BaseModel):
    title: str = Field(..., max_length=255)


class FileWriteRequest(BaseModel):
    content: str


class ChatHistorySave(BaseModel):
    messages: List[Dict[str, str]]  # [{ "role": "user"|"assistant", "content": "..." }]


# ── Response Schemas ──────────────────────────────────────────────────────────

class FileTreeEntry(BaseModel):
    size: int = 0
    lang: str = ""


class CodingSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    file_tree: Dict[str, Any] = {}
    chat_history: List[Dict[str, str]] = []
    created_at: datetime
    last_active: datetime

    class Config:
        from_attributes = True


class CodingSessionListItem(BaseModel):
    id: UUID
    title: str
    file_count: int = 0
    created_at: datetime
    last_active: datetime

    class Config:
        from_attributes = True

