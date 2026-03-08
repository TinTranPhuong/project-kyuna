import axiosInstance from '@/lib/axios'
import type { SessionStats } from '@/types/timer.types'

export type { SessionStats }

/**
 * Sessions service.
 *
 * Backend router: /api/v1/sessions
 * Endpoints (backend/app/routers/sessions.py):
 *   POST /pomodoro  — save a completed session
 *   GET  /stats     — aggregate stats for the current user
 *   GET  /chart     — daily focus breakdown for the last N days
 */
export interface SaveSessionPayload {
  session_type: 'work' | 'short_break' | 'long_break'
  duration_minutes: number
  completed: boolean
  started_at: string
  notes?: string
}

export interface DailyChartPoint {
  day: string
  minutes: number
}

export const sessionsService = {

  /**
   * POST /api/v1/sessions/pomodoro
   *
   * Called by timerStore.saveCompletedSession() when a work phase hits 0.
   * All field names are snake_case to match the FastAPI Pydantic schema.
   *
   * @example
   * sessionsService.savePomodoroSession({
   *   session_type: 'work',
   *   duration_minutes: 25,
   *   completed: true,
   *   started_at: new Date().toISOString(),
   * })
   */
  savePomodoroSession: async (data: SaveSessionPayload): Promise<void> => {
    await axiosInstance.post('/api/v1/sessions/pomodoro', data)
  },

  /**
   * GET /api/v1/sessions/stats
   *
   * Returns aggregate stats for the current user.
   * Response shape matches backend SessionStatsResponse Pydantic schema,
   * which is defined in @/types/timer.types.ts → SessionStats.
   *
   * Fields: total_sessions, total_focus_minutes, sessions_today,
   *         current_streak, longest_streak
   */
  getStats: async (): Promise<SessionStats> => {
    const response = await axiosInstance.get<SessionStats>('/api/v1/sessions/stats')
    return response.data
  },

  /**
   * GET /api/v1/sessions/chart?days=7
   *
   * Returns daily focus minutes for the last `days` days (default 7, max 30).
   * Missing days are filled with 0 on the backend — the array always has
   * exactly `days` entries, safe to pass directly into <FocusChart />.
   */
  getDailyChart: async (days = 7): Promise<DailyChartPoint[]> => {
    const response = await axiosInstance.get<DailyChartPoint[]>('/api/v1/sessions/chart', {
      params: { days },
    })
    return response.data
  },
}