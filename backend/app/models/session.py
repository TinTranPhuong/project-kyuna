import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User

class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    session_type: Mapped[str] = mapped_column(String(20), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", nullable=False)
    
    # Set by application when user clicks "Start"
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "session_type IN ('work', 'short_break', 'long_break')", 
            name="chk_session_type"
        ),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    user: Mapped["User"] = relationship("User", back_populates="pomodoro_sessions")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True, 
        nullable=False
    )
    
    theme: Mapped[str] = mapped_column(String(50), default="night-garden", server_default="night-garden")
    font_size: Mapped[int] = mapped_column(Integer, default=14, server_default="14")
    music_url: Mapped[str] = mapped_column(
        Text, 
        default="https://www.youtube.com/watch?v=jfKfPfyJRdk", 
        server_default="https://www.youtube.com/watch?v=jfKfPfyJRdk"
    )
    
    preferred_chat_model: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    preferred_vision_model: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    pomodoro_work_minutes: Mapped[int] = mapped_column(Integer, default=25, server_default="25")
    pomodoro_short_break: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    pomodoro_long_break: Mapped[int] = mapped_column(Integer, default=15, server_default="15")
    auto_start_breaks: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    notification_sound: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    user: Mapped["User"] = relationship("User", back_populates="settings")