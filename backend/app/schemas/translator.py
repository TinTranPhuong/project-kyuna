import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, Field


class JobResponse(BaseModel):
    id: UUID
    original_filename: str
    status: str
    engine: str = "pipeline"  
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
    
    # Exposes the 6-stage pipeline progress to the frontend
    phase_status: str = "pending"
    
    error_message: Optional[str] = None
    
    # Maps the DB's regions_json text column to a parsed list for the frontend
    regions: Optional[List[dict]] = Field(default=None, validation_alias="regions_json")
    
    @field_validator('regions', mode='before')
    @classmethod
    def parse_regions_json(cls, v):
        """Accepts either a list (already parsed) or a JSON string."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v
    
    # populate_by_name allows Pydantic to read 'regions_json' from SQLAlchemy 
    # but output it as 'regions' in the final JSON response
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class JobDetailResponse(JobResponse):
    pages: List[PageResponse]
    
    model_config = ConfigDict(from_attributes=True)