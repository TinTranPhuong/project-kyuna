export type TimerMode = 'pomodoro' | 'stopwatch'
export type TimerPhase = 'work' | 'short_break' | 'long_break'

export interface SessionStats {
  total_sessions: number
  total_focus_minutes: number
  sessions_today: number
  current_streak: number
  longest_streak: number
}