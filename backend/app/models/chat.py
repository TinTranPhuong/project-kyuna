import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", server_default="New Conversation")
    model_used: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    message_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", 
        back_populates="conversation", 
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at.asc()" # Always load messages in chronological order
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_conversations.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    generation_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant', 'system')", 
            name="chk_message_role"
        ),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    conversation: Mapped["ChatConversation"] = relationship("ChatConversation", back_populates="messages")