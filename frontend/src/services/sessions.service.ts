import axiosInstance from '@/lib/axios'
import type { SessionStats } from '@/types/timer.types'

// Re-export so callers import from one place
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

// ─── Request shape (matches backend CreateSessionRequest Pydantic schema) ────
// Fields use snake_case — FastAPI validation will reject camelCase keys.
// Required: session_type, duration_minutes, completed, started_at
// Optional: notes
export interface SaveSessionPayload {
  session_type: 'work' | 'short_break' | 'long_break'
  duration_minutes: number
  completed: boolean
  started_at: string    // ISO 8601 datetime string, e.g. new Date().toISOString()
  notes?: string
}

// ─── Daily chart point (matches backend DailyChartPoint schema) ──────────────
export interface DailyChartPoint {
  day: string       // abbreviated day name: "Mon", "Tue", …
  minutes: number   // total focus minutes for that day (0 if no sessions)
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