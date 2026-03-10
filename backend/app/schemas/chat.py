from datetime import datetime
from typing import List, Optional, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

class ChatMessageRequest(BaseModel):
    content: str  
    model_used: Optional[str] = None  
    image_base64: Optional[str] = None
    mode: Literal["fast", "thinking", "agentic"] = "fast"
    
    model_config = ConfigDict(protected_namespaces=())
    
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
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str
    tokens_used: Optional[int] = None
    generation_ms: Optional[int] = None
    model_used: Optional[str] = None
    image_base64: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse]
    
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    model: Optional[str] = None


class ModelInfoResponse(BaseModel):
    id: str
    name: str
    type: str = Field(pattern="^(text|vision)$")
    file_size_gb: Optional[float] = None
    is_loaded: bool = False
    size: str = ""
    context_window: int = 0
    description: Optional[str] = None
    
class MessageCreate(BaseModel):
    content: str
    model: Optional[str] = None