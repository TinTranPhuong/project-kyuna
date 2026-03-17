"""
CodingSession model — stores metadata for a code workspace session.
File content lives on disk at uploads/coding_sessions/{user_id}/{session_id}/.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from app.models.base import Base


class CodingSession(Base):
    __tablename__ = "coding_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Untitled Project")
    file_tree = Column(JSON, nullable=False, default=dict)  # { "src/main.py": { "size": 1234, "lang": "python" }, ... }
    chat_history = Column(JSON, nullable=False, default=list)  # [{ "role": "user"|"assistant", "content": "..." }]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
