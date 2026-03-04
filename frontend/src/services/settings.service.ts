import axiosInstance from '@/lib/axios'
import type { MusicGroup } from '@/store/settingsStore'

export interface BackendSettings {
  theme: string
  font_size: number
  custom_wallpaper: string | null
  music_url: string
  music_groups: MusicGroup[] | null
  preferred_chat_model: string | null
  preferred_vision_model: string | null
  pomodoro_work_minutes: number
  pomodoro_short_break: number
  pomodoro_long_break: number
  auto_start_breaks: boolean
  notification_sound: boolean
}

export type SettingsUpdate = Partial<BackendSettings>

export const settingsService = {

  get: async (): Promise<BackendSettings> => {
    const res = await axiosInstance.get<BackendSettings>('/api/v1/users/me/settings')
    return res.data
  },

  update: async (data: SettingsUpdate): Promise<BackendSettings> => {
    const res = await axiosInstance.patch<BackendSettings>('/api/v1/users/me/settings', data)
    return res.data
  },
}