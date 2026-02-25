// Standard FastAPI error response:
export interface APIError {
  detail: string | { msg: string; type: string }[]
}

// Paginated list response wrapper:
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface DashboardStats {
  total_focus_minutes: number
  total_sessions: number
  sessions_today: number
  current_streak: number
  longest_streak: number
  total_chats: number
  total_translations: number
  daily_focus_chart: { day: string; minutes: number }[]
  recent_activity: ActivityItem[]
}

export interface ActivityItem {
  type: 'chat' | 'translation'
  id: string
  title: string
  created_at: string
}