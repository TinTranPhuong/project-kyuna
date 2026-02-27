from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.session import (
    CreateSessionRequest,
    SessionResponse,
    SessionStatsResponse,
    DailyChartPoint,
)
from app.services import session_service

router = APIRouter()


@router.post("/pomodoro", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def save_session(
    data: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a completed or skipped Pomodoro session."""
    return await session_service.create_session(db, current_user.id, data)


@router.get("/stats", response_model=SessionStatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate session statistics and streaks for the current user."""
    return await session_service.get_user_stats(db, current_user.id)


@router.get("/chart", response_model=List[DailyChartPoint])
async def get_chart_data(
    days: int = Query(default=7, ge=1, le=30, description="Number of days to fetch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get daily focus minutes. 
    The service layer handles grouping by DATE(started_at) and filling in 0s for missing days.
    """
    return await session_service.get_daily_chart_data(db, current_user.id, days)