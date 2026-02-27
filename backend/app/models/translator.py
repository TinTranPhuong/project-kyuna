import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, BigInteger, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class TranslationJob(Base):
    __tablename__ = "translation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)
    
    source_language: Mapped[str] = mapped_column(String(10), default="auto", server_default="auto")
    target_language: Mapped[str] = mapped_column(String(10), default="en", server_default="en")
    model_used: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    page_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')", 
            name="chk_job_status"
        ),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    user: Mapped["User"] = relationship("User", back_populates="translation_jobs")
    pages: Mapped[List["TranslationPage"]] = relationship(
        "TranslationPage", 
        back_populates="job", 
        cascade="all, delete-orphan",
        order_by="TranslationPage.page_number.asc()" # Keep pages in sequential order
    )


class TranslationPage(Base):
    __tablename__ = "translation_pages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("translation_jobs.id", ondelete="CASCADE"), 
        index=True, 
        nullable=False
    )
    
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    translated_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    
    ocr_raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    translated_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    has_text: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    
    processing_status: Mapped[str] = mapped_column(
        String(20), 
        default="pending", 
        server_default="pending", 
        nullable=False
    )
    
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processing_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "processing_status IN ('pending', 'processing', 'done', 'no_text', 'failed')", 
            name="chk_page_status"
        ),
        UniqueConstraint("job_id", "page_number", name="uq_translation_pages_job_id_page_number"),
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    
    job: Mapped["TranslationJob"] = relationship("TranslationJob", back_populates="pages")