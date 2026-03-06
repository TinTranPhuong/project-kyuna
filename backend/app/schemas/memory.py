from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MemoryFactUpdate(BaseModel):
    subject: Optional[str] = None
    predicate: Optional[str] = None
    object: Optional[str] = None
    is_active: Optional[bool] = None

class MemoryFactResponse(BaseModel):
    id: UUID
    conversation_id: Optional[UUID] = None
    subject: str
    predicate: str
    object: str
    raw_text: str
    confidence: float
    is_universal: bool
    is_active: bool
    source: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UniversalFactCreate(BaseModel):
    content: str

class UniversalFactUpdate(BaseModel):
    content: Optional[str] = None
    is_active: Optional[bool] = None

class UniversalFactResponse(BaseModel):
    id: UUID
    content: str
    source: str
    origin_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class BulkDeleteRequest(BaseModel):
    fact_ids: List[UUID]

class BulkDeleteResponse(BaseModel):
    deleted_count: int

class SearchResultItem(BaseModel):
    id: UUID
    score: float
    payload: dict

class MemorySearchResponse(BaseModel):
    memories: List[SearchResultItem]
    documents: List[SearchResultItem]
    universals: List[SearchResultItem]