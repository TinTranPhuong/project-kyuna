import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeType = 'night-garden' | 'rainy-city' | 'space' | 'forest'

export interface MusicLink {
  id: string;
  title: string;
  url: string;
}

export interface MusicGroup {
  id: string;
  name: string;
  links: MusicLink[];
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface SettingsState {
  // Appearance
  theme: ThemeType
  fontSize: number

  // Music
  musicUrl: string
  musicGroups: MusicGroup[] // <--- NEW: Stores all your playlists

  // Pomodoro Config
  pomodoroWork: number
  pomodoroShortBreak: number
  pomodoroLongBreak: number
  autoStartBreaks: boolean
  notificationSound: boolean

  // AI Models
  chatModel: string | null
  visionModel: string | null

  // Actions
  setTheme: (theme: ThemeType) => void
  setFontSize: (size: number) => void
  setMusicUrl: (url: string) => void
  setMusicGroups: (groups: MusicGroup[]) => void // <--- NEW: Action to update groups
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
      musicUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 

      // Initialize with default presets so you don't lose them!
      musicGroups: [
        {
          id: 'default-preset',
          name: 'Curated Presets',
          links: [
            { id: 'p1', title: 'Lo-fi Hip Hop', url: 'https://youtube.com/watch?v=jfKfPfyJRdk' },
            { id: 'p2', title: 'Chillhop', url: 'https://youtube.com/watch?v=5yx6BWlEVcU' },
            { id: 'p3', title: 'Smooth Jazz', url: 'https://youtube.com/watch?v=neV3EPgvZ3g' }
          ]
        }
      ],

      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      autoStartBreaks: false,
      notificationSound: true,

      chatModel: null,
      visionModel: null,

      // ── Actions ────────────────────────────────────────────────────────────
      setTheme: (theme) => set({ theme }),

      setFontSize: (size) => {
        const clamped = Math.min(Math.max(size, 12))
        document.documentElement.style.fontSize = `${clamped}px`
        set({ fontSize: clamped })
      },

      setMusicUrl: (musicUrl) => set({ musicUrl }),
      setMusicGroups: (musicGroups) => set({ musicGroups }),

      setPomodoroWork: (pomodoroWork) => set({ pomodoroWork }),
      setPomodoroShortBreak: (pomodoroShortBreak) => set({ pomodoroShortBreak }),
      setPomodoroLongBreak: (pomodoroLongBreak) => set({ pomodoroLongBreak }),
      setToggle: (key, value) => set({ [key]: value }),
      setChatModel: (chatModel) => set({ chatModel }),
      setVisionModel: (visionModel) => set({ visionModel }),
    }),
    {
      name: 'kyuna-settings-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.style.fontSize = `${state.fontSize}px`
        }
      },
    }
  )
)