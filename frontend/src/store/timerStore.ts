import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'
import { sessionsService } from '@/services/sessions.service'

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode  = 'pomodoro' | 'stopwatch'
type TimerPhase = 'work' | 'short_break' | 'long_break'

// ─── State Interface ──────────────────────────────────────────────────────────

interface TimerState {
  mode: TimerMode
  phase: TimerPhase
  timeLeft: number           
  isRunning: boolean
  sessionCount: number       
  intervalId: ReturnType<typeof setInterval> | null   

  // Stopwatch
  stopwatchMs: number
  lapTimes: number[]
  stopwatchIntervalId: ReturnType<typeof setInterval> | null

  // Actions
  setMode: (mode: TimerMode) => void
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  restoreTimer: () => void

  // Stopwatch
  startStopwatch: () => void
  stopStopwatch: () => void
  lapStopwatch: () => void
  resetStopwatch: () => void

  // Internal
  playNotificationSound: () => void
  saveCompletedSession: () => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      mode: 'pomodoro',
      phase: 'work',
      timeLeft: 1500,   
      isRunning: false,
      sessionCount: 0,
      intervalId: null,

      stopwatchMs: 0,
      lapTimes: [],
      stopwatchIntervalId: null,

      // ── Mode ──────────────────────────────────────────────────────────────

      setMode: (mode) => {
        get().pause()
        get().stopStopwatch()
        set({ mode })
      },

      // ── Pomodoro Controls ─────────────────────────────────────────────────

      start: () => {
        if (get().isRunning) return   
        const id = setInterval(() => get().tick(), 1000)
        set({ isRunning: true, intervalId: id })
      },

      pause: () => {
        const { intervalId } = get()
        if (intervalId) clearInterval(intervalId)
        set({ isRunning: false, intervalId: null })
      },

      reset: () => {
        get().pause()
        const settings = useSettingsStore.getState()
        const { phase } = get()
        const newTime =
          phase === 'work'        ? settings.pomodoroWork * 60 :
          phase === 'short_break' ? settings.pomodoroShortBreak * 60 :
                                    settings.pomodoroLongBreak * 60
        set({ timeLeft: newTime })
      },

      tick: () => {
        const { timeLeft, phase } = get()
        if (timeLeft > 0) {
          set({ timeLeft: timeLeft - 1 })
          return
        }

        get().playNotificationSound()
        if (phase === 'work') {
          void get().saveCompletedSession()
        }
        get().skip()
      },

      skip: () => {
        get().pause()  

        const { phase, sessionCount } = get()
        const settings = useSettingsStore.getState()

        let nextPhase: TimerPhase
        let nextSessionCount = sessionCount

        if (phase === 'work') {
          nextSessionCount += 1
          nextPhase = nextSessionCount % 4 === 0 ? 'long_break' : 'short_break'
        } else {
          nextPhase = 'work'
        }

        const nextTime =
          nextPhase === 'work'        ? settings.pomodoroWork * 60 :
          nextPhase === 'short_break' ? settings.pomodoroShortBreak * 60 :
                                        settings.pomodoroLongBreak * 60

        set({ phase: nextPhase, timeLeft: nextTime, sessionCount: nextSessionCount })

        if (settings.autoStartBreaks) {
          get().start()
        }
      },

      /**
       * Call once in App.tsx (or the layout root) on mount.
       * If the timer was running when the user last closed the tab
       * (isRunning was persisted as true), this re-attaches the setInterval.
       * Without this, the countdown pauses silently after a page reload.
       */
      restoreTimer: () => {
        if (get().isRunning && !get().intervalId) {
          const id = setInterval(() => get().tick(), 1000)
          set({ intervalId: id })
        }
      },

      // ── Stopwatch ──────────────────────────────────────────────────────────

      startStopwatch: () => {
        if (get().stopwatchIntervalId) return   
        const id = setInterval(() => {
          set(state => ({ stopwatchMs: state.stopwatchMs + 10 }))
        }, 10)
        set({ stopwatchIntervalId: id })
      },

      stopStopwatch: () => {
        const { stopwatchIntervalId } = get()
        if (stopwatchIntervalId) clearInterval(stopwatchIntervalId)
        set({ stopwatchIntervalId: null })
      },

      lapStopwatch: () => {
        set(state => ({ lapTimes: [...state.lapTimes, state.stopwatchMs] }))
      },

      resetStopwatch: () => {
        get().stopStopwatch()
        set({ stopwatchMs: 0, lapTimes: [] })
      },

      // ── Internal Helpers ───────────────────────────────────────────────────

      playNotificationSound: () => {
        if (!useSettingsStore.getState().notificationSound) return
        new Audio('/sounds/bell.mp3').play().catch(() => {})
      },

      /**
       * Saves the just-completed work session to the backend.
       * Reads the duration from settingsStore so it reflects any in-session
       * duration changes made on the SettingsPage.
       *
       * Errors are non-fatal — a failed save should not interrupt the timer UX.
       */
      saveCompletedSession: async () => {
        const settings = useSettingsStore.getState()
        try {
          await sessionsService.savePomodoroSession({
            session_type:     'work',
            duration_minutes: settings.pomodoroWork,
            completed:        true,
            started_at:       new Date(
              Date.now() - settings.pomodoroWork * 60 * 1000
            ).toISOString(),
          })
        } catch (error) {
          console.error('Failed to save pomodoro session:', error)
        }
      },
    }),
    {
      name: 'kyuna-timer-storage',
      storage: createJSONStorage(() => localStorage),
      /**
       * Persist timer position but NOT the interval reference (it's a runtime handle).
       *
       * isRunning IS persisted so restoreTimer() knows whether to re-attach the
       * interval on page load. The alternative (not persisting isRunning) would
       * cause the timer to always appear paused after a reload even if it was
       * counting down when the user left.
       */
      partialize: (state) => ({
        mode:         state.mode,
        phase:        state.phase,
        timeLeft:     state.timeLeft,
        isRunning:    state.isRunning,
        sessionCount: state.sessionCount,
        stopwatchMs:  state.stopwatchMs,
        lapTimes:     state.lapTimes,
      }),
    }
  )
)