from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID

class AgentPlanStep(BaseModel):
    step_index: int
    tool_name: str
    agent_name: Optional[str] = None
    args: Dict[str, Any]
    description: str
    requires_hitl: bool

class AgentPlanCreate(BaseModel):
    steps: List[AgentPlanStep]

class AgentPlanResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    user_id: UUID
    steps: List[Dict[str, Any]]
    status: str
    approved_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AgentApproveRequest(BaseModel):
    steps: List[AgentPlanStep]
    enable_consensus: bool = False

class AgentRunResponse(BaseModel):
    id: UUID
    plan_id: UUID
    mode: str
    duration_ms: Optional[int]
    final_status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
