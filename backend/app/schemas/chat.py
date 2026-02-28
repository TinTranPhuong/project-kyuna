from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

class ChatMessageRequest(BaseModel):
    content: str  
    model_used: Optional[str] = None  
    
class CreateConversationRequest(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    model_used: Optional[str] = None
    message_count: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str
    tokens_used: Optional[int] = None
    generation_ms: Optional[int] = None
    model_used: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse]
    
    model_config = ConfigDict(from_attributes=True)


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    model: Optional[str] = None


class ModelInfoResponse(BaseModel):
    id: str
    name: str
    file_size_gb: Optional[float] = None
    type: str = Field(pattern="^(text|vision)$")