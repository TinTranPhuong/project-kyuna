import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeType = 'night-garden' | 'rainy-city' | 'space' | 'forest';

interface SettingsState {
  // Appearance
  theme: ThemeType;
  fontSize: number;
  
  // Music
  musicUrl: string;
  
  // Pomodoro Config
  pomodoroWork: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  autoStartBreaks: boolean;
  notificationSound: boolean;
  
  // AI Models
  chatModel: string | null;
  visionModel: string | null;

  // Actions
  setTheme: (theme: ThemeType) => void;
  setFontSize: (size: number) => void;
  setMusicUrl: (url: string) => void;
  
  // Timer Actions
  setPomodoroWork: (min: number) => void;
  setPomodoroShortBreak: (min: number) => void;
  setPomodoroLongBreak: (min: number) => void;
  setToggle: (key: 'autoStartBreaks' | 'notificationSound', value: boolean) => void;
  
  // AI Actions
  setChatModel: (model: string) => void;
  setVisionModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // --- Initial State ---
      theme: 'night-garden',
      fontSize: 16,
      musicUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Default Lo-fi
      
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      autoStartBreaks: false,
      notificationSound: true,
      
      chatModel: 'qwen-2.5-14b-gguf', // Optimized for your 16GB VRAM
      visionModel: 'llava-1.5-7b-gguf',

      // --- Actions ---
      setTheme: (theme) => set({ theme }),

      setFontSize: (size) => {
        // Validation: Keep within the requested 12-18px range
        const clampedSize = Math.min(Math.max(size, 12), 18);
        
        // Side Effect: Apply to the root element immediately for global scaling
        document.documentElement.style.fontSize = `${clampedSize}px`;
        
        set({ fontSize: clampedSize });
      },

      setMusicUrl: (musicUrl) => set({ musicUrl }),

      setPomodoroWork: (pomodoroWork) => set({ pomodoroWork }),
      setPomodoroShortBreak: (pomodoroShortBreak) => set({ pomodoroShortBreak }),
      setPomodoroLongBreak: (pomodoroLongBreak) => set({ pomodoroLongBreak }),
      
      setToggle: (key, value) => set({ [key]: value }),

      setChatModel: (chatModel) => set({ chatModel }),
      setVisionModel: (visionModel) => set({ visionModel }),
    }),
    {
      name: 'luna-settings-storage',
      storage: createJSONStorage(() => localStorage),
      // Ensure the font size is reapplied upon hydration (page reload)
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.style.fontSize = `${state.fontSize}px`;
        }
      },
    }
  )
);