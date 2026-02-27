from app.core.database import Base
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import DateTime, func
from datetime import datetime

class TimestampMixin:
    """Add created_at and updated_at to any model."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )