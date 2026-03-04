from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import session_service, translator_service

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Single endpoint that aggregates all dashboard data in one call.
    Avoids multiple waterfall requests from DashboardPage on mount.
    """
    # Pomodoro stats (total focus, sessions, streak)
    stats = await session_service.get_user_stats(db, current_user.id)

    # Daily chart for the last 7 days
    chart = await session_service.get_daily_chart_data(db, current_user.id, days=7)

    # Total pages translated (count translation pages with status 'done')
    total_translations = await translator_service.count_translated_pages(db, current_user.id)

    return {
        "total_focus_minutes":  stats["total_focus_minutes"],
        "total_sessions":       stats["total_sessions"],
        "sessions_today":       stats["sessions_today"],
        "current_streak":       stats["current_streak"],
        "longest_streak":       stats["longest_streak"],
        "total_translations":   total_translations,
        "daily_focus_chart":    chart,
    }