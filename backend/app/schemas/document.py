from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_size_bytes: Optional[int]
    file_type: str
    status: str
    chunk_count: int
    error_message: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class DocChunkResponse(BaseModel):
    id: UUID
    chunk_index: int
    content: str
    page_number: Optional[int]
    section_heading: Optional[str]
    token_count: int

    model_config = ConfigDict(from_attributes=True)

class ChunkPaginatedResponse(BaseModel):
    items: List[DocChunkResponse]
    total: int