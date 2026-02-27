from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.session import PomodoroSession
from app.schemas.session import CreateSessionRequest


async def create_session(db: AsyncSession, user_id: str, data: CreateSessionRequest) -> PomodoroSession:
    """Creates a new Pomodoro session record."""
    new_session = PomodoroSession(
        user_id=user_id,
        session_type=data.session_type,
        duration_minutes=data.duration_minutes,
        completed=data.completed,
        started_at=data.started_at,
        completed_at=datetime.now(timezone.utc) if data.completed else None,
        notes=data.notes
    )
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session


async def get_user_stats(db: AsyncSession, user_id: str) -> dict:
    """Aggregates lifetime stats, today's stats, and streak logic."""
    now = datetime.now(timezone.utc)
    today_date = now.date()

    # Fetch all completed work sessions to calculate stats in memory
    # (Safe and perfectly fast for a single user's dataset)
    stmt = select(PomodoroSession).where(
        PomodoroSession.user_id == user_id,
        PomodoroSession.session_type == "work",
        PomodoroSession.completed == True
    ).order_by(desc(PomodoroSession.started_at))
    
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    total_sessions = len(sessions)
    total_focus_minutes = sum(s.duration_minutes for s in sessions)
    
    # Calculate sessions today
    sessions_today = sum(1 for s in sessions if s.started_at.date() == today_date)

    # Calculate streaks
    unique_dates = sorted(list({s.started_at.date() for s in sessions}), reverse=True)
    
    current_streak = 0
    check_date = today_date
    
    # If they haven't done a session today, the streak might still be alive from yesterday
    if unique_dates and unique_dates[0] < today_date:
        if unique_dates[0] == today_date - timedelta(days=1):
            check_date = today_date - timedelta(days=1)
        else:
            current_streak = 0 # Streak broken
            
    for d in unique_dates:
        if d == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        elif d < check_date:
            break

    # To calculate longest streak, we can iterate through all unique dates
    longest_streak = 0
    temp_streak = 0
    prev_date = None
    
    # Sort ascending for longest streak calculation
    for d in sorted(unique_dates):
        if prev_date is None or d == prev_date + timedelta(days=1):
            temp_streak += 1
        else:
            temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)
        prev_date = d

    return {
        "total_sessions": total_sessions,
        "total_focus_minutes": total_focus_minutes,
        "sessions_today": sessions_today,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "chart_data": [] # Populated dynamically by the chart endpoint if needed, but schema requires it
    }


async def get_daily_chart_data(db: AsyncSession, user_id: str, days: int) -> List[dict]:
    """Generates chart data, filling in missing days with 0 minutes."""
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(days=days - 1)
    
    stmt = select(PomodoroSession).where(
        PomodoroSession.user_id == user_id,
        PomodoroSession.session_type == "work",
        PomodoroSession.completed == True,
        PomodoroSession.started_at >= cutoff_date
    )
    
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    # Aggregate by date string
    daily_totals = defaultdict(int)
    for s in sessions:
        date_str = s.started_at.strftime("%a") # e.g., "Mon", "Tue"
        # Use full date as key first to ensure accurate grouping, then format
        full_date = s.started_at.date()
        daily_totals[full_date] += s.duration_minutes

    chart_data = []
    for i in range(days):
        target_date = cutoff_date.date() + timedelta(days=i)
        chart_data.append({
            "day": target_date.strftime("%a"),
            "minutes": daily_totals.get(target_date, 0)
        })

    return chart_data