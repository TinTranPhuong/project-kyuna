import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const TimerDisplay = () => {
  const { timeLeft, phase } = useTimerStore();
  const { pomodoroWork, pomodoroShortBreak, pomodoroLongBreak } = useSettingsStore();

  // 1. Determine maximum time for the current phase (in seconds)
  let totalTime = 0;
  switch (phase) {
    case 'work':
      totalTime = pomodoroWork * 60;
      break;
    case 'short_break':
      totalTime = pomodoroShortBreak * 60;
      break;
    case 'long_break':
      totalTime = pomodoroLongBreak * 60;
      break;
  }

  // 2. Map the phase to the display label and color
  const phaseConfig = {
    work: { label: 'FOCUS', color: 'text-primary-500' },
    short_break: { label: 'SHORT BREAK', color: 'text-green-400' },
    long_break: { label: 'LONG BREAK', color: 'text-blue-400' },
  };

  const { label, color } = phaseConfig[phase] || phaseConfig.work;

  // 3. Calculate SVG Circle Math
  const radius = 140; 
  const circumference = 2 * Math.PI * radius;
  // Ensure we don't divide by zero if totalTime somehow glitches
  const percentRemaining = totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference - percentRemaining * circumference;

  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px] my-4">
      {/* Background Track Circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
        <circle
          cx="160"
          cy="160"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-white/5"
        />
        {/* Animated Progress Circle */}
        <circle
          cx="160"
          cy="160"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-1000 ease-linear",
            color
          )}
        />
      </svg>

      {/* Center Text Information */}
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
        <span className="font-display text-8xl font-bold text-white tracking-tighter drop-shadow-md">
          {formatTime(timeLeft)}
        </span>
        <span className={cn(
          "text-sm font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-white/5 border border-white/10",
          color
        )}>
          {label}
        </span>
      </div>
    </div>
  );
};

export default TimerDisplay;