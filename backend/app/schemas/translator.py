from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class JobResponse(BaseModel):
    id: UUID
    original_filename: str
    status: str
    source_language: str
    target_language: str
    page_count: int
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class PageResponse(BaseModel):
    id: UUID
    job_id: UUID
    page_number: int
    has_text: bool
    processing_status: str
    error_message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class JobDetailResponse(JobResponse):
    pages: List[PageResponse]
    
    model_config = ConfigDict(from_attributes=True)