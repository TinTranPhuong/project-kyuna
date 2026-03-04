import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { settingsService } from '@/services/settings.service'

export type ThemeType = 'night-garden' | 'rainy-city' | 'space' | 'forest'

export interface MusicLink {
  id: string
  title: string
  url: string
}

export interface MusicGroup {
  id: string
  name: string
  links: MusicLink[]
}

interface SettingsState {
  // Appearance
  theme: ThemeType
  fontSize: number
  customWallpaper: string | null   // base64 data URL or hosted URL; null = use theme video

  // Music
  musicUrl: string
  musicGroups: MusicGroup[]

  // Pomodoro
  pomodoroWork: number
  pomodoroShortBreak: number
  pomodoroLongBreak: number
  autoStartBreaks: boolean
  notificationSound: boolean

  // AI Models
  chatModel: string | null
  visionModel: string | null

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  /** Called after login/init — pulls settings from PostgreSQL into this store. */
  syncFromBackend: () => Promise<void>

  // ── Actions (each immediately syncs to backend) ────────────────────────────
  setTheme: (theme: ThemeType) => void
  setFontSize: (size: number) => void
  setCustomWallpaper: (dataUrl: string | null) => void
  setMusicUrl: (url: string) => void
  setMusicGroups: (groups: MusicGroup[]) => void
  setPomodoroWork: (min: number) => void
  setPomodoroShortBreak: (min: number) => void
  setPomodoroLongBreak: (min: number) => void
  setToggle: (key: 'autoStartBreaks' | 'notificationSound', value: boolean) => void
  setChatModel: (model: string) => void
  setVisionModel: (model: string) => void
}

// Helper — fire-and-forget backend sync, never throws
function sync(data: Parameters<typeof settingsService.update>[0]) {
  settingsService.update(data).catch(err =>
    console.error('[settingsStore] Backend sync failed:', err)
  )
}

const DEFAULT_MUSIC_GROUPS: MusicGroup[] = [
  {
    id: 'default-preset',
    name: 'Curated Presets',
    links: [
      { id: 'p1', title: 'Lo-fi Hip Hop', url: 'https://youtube.com/watch?v=jfKfPfyJRdk' },
      { id: 'p2', title: 'Chillhop',      url: 'https://youtube.com/watch?v=5yx6BWlEVcU' },
      { id: 'p3', title: 'Smooth Jazz',   url: 'https://youtube.com/watch?v=neV3EPgvZ3g' },
    ],
  },
]

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // ── Defaults (used until syncFromBackend() overwrites them) ────────────
      theme: 'night-garden',
      fontSize: 16,
      customWallpaper: null,
      musicUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      musicGroups: DEFAULT_MUSIC_GROUPS,
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      autoStartBreaks: false,
      notificationSound: true,
      chatModel: null,
      visionModel: null,

      // ── Hydrate from PostgreSQL ────────────────────────────────────────────
      syncFromBackend: async () => {
        try {
          const s = await settingsService.get()
          set({
            theme:             (s.theme as ThemeType) ?? 'night-garden',
            fontSize:          s.font_size             ?? 16,
            customWallpaper:   s.custom_wallpaper       ?? null,
            musicUrl:          s.music_url              ?? 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
            musicGroups:       s.music_groups           ?? DEFAULT_MUSIC_GROUPS,
            pomodoroWork:      s.pomodoro_work_minutes  ?? 25,
            pomodoroShortBreak:s.pomodoro_short_break   ?? 5,
            pomodoroLongBreak: s.pomodoro_long_break    ?? 15,
            autoStartBreaks:   s.auto_start_breaks      ?? false,
            notificationSound: s.notification_sound     ?? true,
            chatModel:         s.preferred_chat_model   ?? null,
            visionModel:       s.preferred_vision_model ?? null,
          })
          // Apply font size to DOM
          document.documentElement.style.fontSize = `${s.font_size ?? 16}px`
        } catch (err) {
          console.error('[settingsStore] Failed to sync from backend:', err)
        }
      },

      // ── Actions ───────────────────────────────────────────────────────────
      setTheme: (theme) => {
        set({ theme })
        sync({ theme })
      },

      setFontSize: (size) => {
        const clamped = Math.min(Math.max(size, 12), 24)
        document.documentElement.style.fontSize = `${clamped}px`
        set({ fontSize: clamped })
        sync({ font_size: clamped })
      },

      setCustomWallpaper: (dataUrl) => {
        set({ customWallpaper: dataUrl })
        sync({ custom_wallpaper: dataUrl })
      },

      setMusicUrl: (musicUrl) => {
        set({ musicUrl })
        sync({ music_url: musicUrl })
      },

      setMusicGroups: (musicGroups) => {
        set({ musicGroups })
        sync({ music_groups: musicGroups })
      },

      setPomodoroWork: (pomodoroWork) => {
        set({ pomodoroWork })
        sync({ pomodoro_work_minutes: pomodoroWork })
      },

      setPomodoroShortBreak: (pomodoroShortBreak) => {
        set({ pomodoroShortBreak })
        sync({ pomodoro_short_break: pomodoroShortBreak })
      },

      setPomodoroLongBreak: (pomodoroLongBreak) => {
        set({ pomodoroLongBreak })
        sync({ pomodoro_long_break: pomodoroLongBreak })
      },

      setToggle: (key, value) => {
        set({ [key]: value })
        const backendKey = key === 'autoStartBreaks' ? 'auto_start_breaks' : 'notification_sound'
        sync({ [backendKey]: value })
      },

      setChatModel: (chatModel) => {
        set({ chatModel })
        sync({ preferred_chat_model: chatModel })
      },

      setVisionModel: (visionModel) => {
        set({ visionModel })
        sync({ preferred_vision_model: visionModel })
      },
    }),
    {
      name: 'kyuna-settings-storage',
      storage: createJSONStorage(() => localStorage),
      // localStorage is the fallback cache — backend is the source of truth.
      // syncFromBackend() overwrites this cache after every login.
      partialize: (state) => ({
        theme:             state.theme,
        fontSize:          state.fontSize,
        customWallpaper:   state.customWallpaper,
        musicUrl:          state.musicUrl,
        musicGroups:       state.musicGroups,
        pomodoroWork:      state.pomodoroWork,
        pomodoroShortBreak:state.pomodoroShortBreak,
        pomodoroLongBreak: state.pomodoroLongBreak,
        autoStartBreaks:   state.autoStartBreaks,
        notificationSound: state.notificationSound,
        chatModel:         state.chatModel,
        visionModel:       state.visionModel,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.style.fontSize = `${state.fontSize}px`
        }
      },
    }
  )
)