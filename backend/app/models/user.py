import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import PomodoroSession, UserSettings
    from app.models.chat import ChatConversation
    from app.models.translator import TranslationJob
    from app.models.note import Note
    from app.models.memory import MemoryFact, UniversalFact, Document

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # --- Relationships ---------------------------------------------------------

    settings: Mapped[Optional["UserSettings"]] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    pomodoro_sessions: Mapped[List["PomodoroSession"]] = relationship(
        "PomodoroSession", back_populates="user", cascade="all, delete-orphan"
    )
    conversations: Mapped[List["ChatConversation"]] = relationship(
        "ChatConversation", back_populates="user", cascade="all, delete-orphan"
    )
    translation_jobs: Mapped[List["TranslationJob"]] = relationship(
        "TranslationJob", back_populates="user", cascade="all, delete-orphan"
    )
    notes: Mapped[List["Note"]] = relationship(
        "Note", back_populates="user", cascade="all, delete-orphan"
    )
    
    # RAG & Memory System Relationships
    memory_facts: Mapped[List["MemoryFact"]] = relationship(
        "MemoryFact", back_populates="user", cascade="all, delete-orphan"
    )
    universal_facts: Mapped[List["UniversalFact"]] = relationship(
        "UniversalFact", back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan"
    )