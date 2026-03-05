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
  theme: ThemeType
  fontSize: number
  customWallpaper: string | null
  musicUrl: string
  musicGroups: MusicGroup[]
  pomodoroWork: number
  pomodoroShortBreak: number
  pomodoroLongBreak: number
  autoStartBreaks: boolean
  notificationSound: boolean
  chatModel: string | null
  visionModel: string | null

  syncFromBackend: () => Promise<void>
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
  resetToDefaults: () => void
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

const DEFAULTS = {
  theme: 'night-garden' as ThemeType,
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
}

/**
 * Sync a settings patch to the backend.
 * Errors are logged clearly — not silently swallowed.
 */
async function sync(data: Parameters<typeof settingsService.update>[0]) {
  try {
    await settingsService.update(data)
  } catch (err: unknown) {
    // Log with full detail so failures are never invisible
    const msg = err instanceof Error ? err.message : String(err)
    console.error(
      '[settingsStore] SYNC FAILED — data was NOT saved to PostgreSQL.\n' +
      'Payload:', data, '\nError:', msg,
      '\nCheck: Did you run the SQL migration? Is the backend running?'
    )
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      resetToDefaults: () => set({ ...DEFAULTS }),

      // ── Pull from PostgreSQL (called after login / page reload) ────────────
      syncFromBackend: async () => {
        try {
          const s = await settingsService.get()
          const next = {
            theme:              (s.theme as ThemeType)   ?? DEFAULTS.theme,
            fontSize:           s.font_size              ?? DEFAULTS.fontSize,
            customWallpaper:    s.custom_wallpaper        ?? null,
            musicUrl:           s.music_url              ?? DEFAULTS.musicUrl,
            musicGroups:        s.music_groups           ?? DEFAULTS.musicGroups,
            pomodoroWork:       s.pomodoro_work_minutes  ?? DEFAULTS.pomodoroWork,
            pomodoroShortBreak: s.pomodoro_short_break   ?? DEFAULTS.pomodoroShortBreak,
            pomodoroLongBreak:  s.pomodoro_long_break    ?? DEFAULTS.pomodoroLongBreak,
            autoStartBreaks:    s.auto_start_breaks      ?? DEFAULTS.autoStartBreaks,
            notificationSound:  s.notification_sound     ?? DEFAULTS.notificationSound,
            chatModel:          s.preferred_chat_model   ?? null,
            visionModel:        s.preferred_vision_model ?? null,
          }
          set(next)
          document.documentElement.style.fontSize = `${next.fontSize}px`
          console.log('[settingsStore] Synced from backend ✓', next)
        } catch (err) {
          console.error('[settingsStore] syncFromBackend failed:', err)
        }
      },

      // ── Each setter immediately persists to DB ─────────────────────────────

      setTheme: (theme) => {
        set({ theme })
        void sync({ theme })
      },

      setFontSize: (size) => {
        const clamped = Math.min(Math.max(size, 12), 24)
        document.documentElement.style.fontSize = `${clamped}px`
        set({ fontSize: clamped })
        void sync({ font_size: clamped })
      },

      setCustomWallpaper: (dataUrl) => {
        set({ customWallpaper: dataUrl })
        void sync({ custom_wallpaper: dataUrl })
      },

      setMusicUrl: (musicUrl) => {
        set({ musicUrl })
        void sync({ music_url: musicUrl })
      },

      setMusicGroups: (musicGroups) => {
        set({ musicGroups })
        void sync({ music_groups: musicGroups })
      },

      setPomodoroWork: (pomodoroWork) => {
        set({ pomodoroWork })
        void sync({ pomodoro_work_minutes: pomodoroWork })
      },

      setPomodoroShortBreak: (pomodoroShortBreak) => {
        set({ pomodoroShortBreak })
        void sync({ pomodoro_short_break: pomodoroShortBreak })
      },

      setPomodoroLongBreak: (pomodoroLongBreak) => {
        set({ pomodoroLongBreak })
        void sync({ pomodoro_long_break: pomodoroLongBreak })
      },

      setToggle: (key, value) => {
        set({ [key]: value })
        const backendKey = key === 'autoStartBreaks' ? 'auto_start_breaks' : 'notification_sound'
        void sync({ [backendKey]: value })
      },

      setChatModel: (chatModel) => {
        set({ chatModel })
        void sync({ preferred_chat_model: chatModel })
      },

      setVisionModel: (visionModel) => {
        set({ visionModel })
        void sync({ preferred_vision_model: visionModel })
      },
    }),
    {
      name: 'kyuna-settings-storage',
      storage: createJSONStorage(() => localStorage),
      // localStorage = fast cache. PostgreSQL = source of truth.
      // syncFromBackend() overwrites localStorage on every login.
      partialize: (state) => ({
        theme:              state.theme,
        fontSize:           state.fontSize,
        customWallpaper:    state.customWallpaper,
        musicUrl:           state.musicUrl,
        musicGroups:        state.musicGroups,
        pomodoroWork:       state.pomodoroWork,
        pomodoroShortBreak: state.pomodoroShortBreak,
        pomodoroLongBreak:  state.pomodoroLongBreak,
        autoStartBreaks:    state.autoStartBreaks,
        notificationSound:  state.notificationSound,
        chatModel:          state.chatModel,
        visionModel:        state.visionModel,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.fontSize) {
          document.documentElement.style.fontSize = `${state.fontSize}px`
        }
      },
    }
  )
)