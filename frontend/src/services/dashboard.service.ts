import axiosInstance from '@/lib/axios'
import type { DashboardStats } from '@/types/api.types'

// Re-export so callers import types from one place
export type { DashboardStats }

/**
 * Dashboard service.
 *
 * ⚠️  Backend note:
 * GET /api/v1/dashboard/stats is NOT yet registered in backend/app/main.py.
 * The backend dev must add a dashboard router:
 *
 *   from app.routers import dashboard
 *   app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
 *
 * The endpoint aggregates pomodoro_sessions + chat_conversations + translation_jobs
 * into one payload, avoiding three separate waterfall requests on mount.
 *
 * Response shape: see @/types/api.types.ts → DashboardStats
 * All fields use snake_case — matching FastAPI/Pydantic output convention.
 */
export const dashboardService = {

  /**
   * GET /api/v1/dashboard/stats
   *
   * Returns all dashboard data in a single call.
   * Used by DashboardPage with: useQuery(['dashboard-stats'], dashboardService.getStats)
   */
  getStats: async (): Promise<DashboardStats> => {
    const response = await axiosInstance.get<DashboardStats>('/api/v1/dashboard/stats')
    return response.data
  },
}