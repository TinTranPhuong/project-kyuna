from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateSessionRequest(BaseModel):
    session_type: str = Field(pattern="^(work|short_break|long_break)$")
    duration_minutes: int = Field(ge=1, le=180)
    completed: bool
    started_at: datetime
    notes: Optional[str] = None


class SessionResponse(CreateSessionRequest):
    id: UUID
    user_id: UUID
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class DailyChartPoint(BaseModel):
    day: str
    minutes: int


class SessionStatsResponse(BaseModel):
    total_sessions: int
    total_focus_minutes: int
    sessions_today: int
    current_streak: int
    longest_streak: int
    chart_data: List[DailyChartPoint] = []