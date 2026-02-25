import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSettingsStore } from './settingsStore';
// import { sessionsService } from '@/services/sessions.service';

interface TimerState {
  mode: 'pomodoro' | 'stopwatch';
  phase: 'work' | 'short_break' | 'long_break';
  timeLeft: number;
  isRunning: boolean;
  sessionCount: number;
  intervalId: ReturnType<typeof setInterval> | null;

  // Stopwatch specific
  stopwatchMs: number;
  lapTimes: number[];
  stopwatchIntervalId: ReturnType<typeof setInterval> | null;

  // Actions
  setMode: (mode: 'pomodoro' | 'stopwatch') => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  restoreTimer: () => void;
  
  // Stopwatch Actions
  startStopwatch: () => void;
  stopStopwatch: () => void;
  lapStopwatch: () => void;
  resetStopwatch: () => void;

  // Internal Logic
  playNotificationSound: () => void;
  saveCompletedSession: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: 'pomodoro',
      phase: 'work',
      timeLeft: 1500, // 25 mins default
      isRunning: false,
      sessionCount: 0,
      intervalId: null,

      stopwatchMs: 0,
      lapTimes: [],
      stopwatchIntervalId: null,

      setMode: (mode) => {
        get().pause();
        get().stopStopwatch();
        set({ mode });
      },

      start: () => {
        if (get().isRunning) return;
        const id = setInterval(() => get().tick(), 1000);
        set({ isRunning: true, intervalId: id });
      },

      pause: () => {
        const { intervalId } = get();
        if (intervalId) clearInterval(intervalId);
        set({ isRunning: false, intervalId: null });
      },

      reset: () => {
        get().pause();
        const settings = useSettingsStore.getState();
        const { phase } = get();
        
        let newTime = settings.pomodoroWork * 60;
        if (phase === 'short_break') newTime = settings.pomodoroShortBreak * 60;
        if (phase === 'long_break') newTime = settings.pomodoroLongBreak * 60;
        
        set({ timeLeft: newTime });
      },

      tick: () => {
        const { timeLeft, phase } = get();
        if (timeLeft > 0) {
          set({ timeLeft: timeLeft - 1 });
        } else {
          // Time is up!
          get().playNotificationSound();
          if (phase === 'work') {
            get().saveCompletedSession();
          }
          get().skip();
        }
      },

      skip: () => {
        const { phase, sessionCount } = get();
        const settings = useSettingsStore.getState();
        let nextPhase: TimerState['phase'];
        let nextSessionCount = sessionCount;

        if (phase === 'work') {
          nextSessionCount += 1;
          // Every 4th session triggers a long break
          nextPhase = nextSessionCount % 4 === 0 ? 'long_break' : 'short_break';
        } else {
          nextPhase = 'work';
        }

        const nextTime = nextPhase === 'work' ? settings.pomodoroWork * 60 
                      : nextPhase === 'short_break' ? settings.pomodoroShortBreak * 60 
                      : settings.pomodoroLongBreak * 60;

        set({ phase: nextPhase, timeLeft: nextTime, sessionCount: nextSessionCount });
        
        if (!settings.autoStartBreaks) {
          get().pause();
        }
      },

      restoreTimer: () => {
        // If it was running before refresh, restart the tick
        if (get().isRunning && !get().intervalId) {
          const id = setInterval(() => get().tick(), 1000);
          set({ intervalId: id });
        }
      },

      // --- Stopwatch ---
      startStopwatch: () => {
        if (get().stopwatchIntervalId) return;
        const id = setInterval(() => {
          set((state) => ({ stopwatchMs: state.stopwatchMs + 10 }));
        }, 10);
        set({ stopwatchIntervalId: id });
      },

      stopStopwatch: () => {
        const { stopwatchIntervalId } = get();
        if (stopwatchIntervalId) clearInterval(stopwatchIntervalId);
        set({ stopwatchIntervalId: null });
      },

      lapStopwatch: () => {
        set((state) => ({ lapTimes: [...state.lapTimes, state.stopwatchMs] }));
      },

      resetStopwatch: () => {
        get().stopStopwatch();
        set({ stopwatchMs: 0, lapTimes: [] });
      },

      playNotificationSound: () => {
        if (useSettingsStore.getState().notificationSound) {
          new Audio('/sounds/bell.mp3').play().catch(() => {});
        }
      },

      saveCompletedSession: async () => {
        // sessionsService.create({ duration: useSettingsStore.getState().pomodoroWork });
        console.log("Focus session saved to database.");
      }
    }),
    {
      name: 'luna-timer-storage',
      storage: createJSONStorage(() => localStorage),
      // Crucial: Do NOT persist intervals
      partialize: (state) => ({
        mode: state.mode,
        phase: state.phase,
        timeLeft: state.timeLeft,
        isRunning: state.isRunning,
        sessionCount: state.sessionCount,
        stopwatchMs: state.stopwatchMs,
        lapTimes: state.lapTimes,
      }),
    }
  )
);