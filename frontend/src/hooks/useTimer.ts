import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatTime } from '@/lib/utils';

/**
 * Custom hook for accessing timer state, controls, and computed values.
 */
export function useTimer() {
  const timerState = useTimerStore();
  const settingsState = useSettingsStore();

  // 1. Calculate total duration in seconds based on the current phase
  let totalDuration = 0;
  switch (timerState.phase) {
    case 'work':
      totalDuration = settingsState.pomodoroWork * 60;
      break;
    case 'short_break':
      totalDuration = settingsState.pomodoroShortBreak * 60;
      break;
    case 'long_break':
      totalDuration = settingsState.pomodoroLongBreak * 60;
      break;
  }

  // 2. Compute progress percentage (protecting against division by zero)
  const progressPercent = totalDuration > 0 
    ? ((totalDuration - timerState.timeLeft) / totalDuration) * 100 
    : 0;

  // 3. Format the remaining time
  const formattedTime = formatTime(timerState.timeLeft);

  return {
    ...timerState, 
    totalDuration,
    progressPercent,
    formattedTime,
  };
}

export default useTimer;

