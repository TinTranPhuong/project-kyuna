from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    title: str = "NOTE"
    text: str = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None


class NoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    text: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)