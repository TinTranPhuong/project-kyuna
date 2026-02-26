import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeType = 'night-garden' | 'rainy-city' | 'space' | 'forest'

// ─── State Interface ──────────────────────────────────────────────────────────

interface SettingsState {
  // Appearance
  theme: ThemeType
  fontSize: number          // clamped 12–18px

  // Music
  musicUrl: string

  // Pomodoro Config
  pomodoroWork: number      // minutes
  pomodoroShortBreak: number
  pomodoroLongBreak: number
  autoStartBreaks: boolean
  notificationSound: boolean

  // AI Models — null until the user selects one from the ModelSelector
  chatModel: string | null
  visionModel: string | null

  // Actions
  setTheme: (theme: ThemeType) => void
  setFontSize: (size: number) => void
  setMusicUrl: (url: string) => void
  setPomodoroWork: (min: number) => void
  setPomodoroShortBreak: (min: number) => void
  setPomodoroLongBreak: (min: number) => void
  setToggle: (key: 'autoStartBreaks' | 'notificationSound', value: boolean) => void
  setChatModel: (model: string) => void
  setVisionModel: (model: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // ── Initial State ──────────────────────────────────────────────────────
      theme: 'night-garden',
      fontSize: 16,
      musicUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lo-fi hip hop default

      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      autoStartBreaks: false,
      notificationSound: true,

      // Null defaults — populated once the user's available models are fetched
      // from GET /api/v1/chat/models and the user picks one in SettingsPage.
      chatModel: null,
      visionModel: null,

      // ── Actions ────────────────────────────────────────────────────────────

      setTheme: (theme) => set({ theme }),

      setFontSize: (size) => {
        const clamped = Math.min(Math.max(size, 12), 18)
        // Apply immediately so the entire UI re-scales without a page reload
        document.documentElement.style.fontSize = `${clamped}px`
        set({ fontSize: clamped })
      },

      setMusicUrl: (musicUrl) => set({ musicUrl }),

      setPomodoroWork: (pomodoroWork) => set({ pomodoroWork }),
      setPomodoroShortBreak: (pomodoroShortBreak) => set({ pomodoroShortBreak }),
      setPomodoroLongBreak: (pomodoroLongBreak) => set({ pomodoroLongBreak }),

      // Generic toggle for any boolean setting — avoids one action per flag
      setToggle: (key, value) => set({ [key]: value }),

      setChatModel: (chatModel) => set({ chatModel }),
      setVisionModel: (visionModel) => set({ visionModel }),
    }),
    {
      name: 'kyuna-settings-storage',
      storage: createJSONStorage(() => localStorage),
      /**
       * Re-apply the persisted font size as soon as Zustand hydrates from
       * localStorage. Without this, the font reverts to the browser default
       * on every hard reload until the first React render finishes.
       */
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.style.fontSize = `${state.fontSize}px`
        }
      },
    }
  )
)