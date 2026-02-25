import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { cn } from '@/lib/utils';

export const TimerControls = () => {
  const { isRunning, start, pause, reset, skip } = useTimerStore();

  return (
    <div className="flex items-center justify-center gap-6 my-6">
      {/* Reset Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={reset}
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-2xl transition-colors outline-none",
          "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5 shadow-sm"
        )}
        aria-label="Reset Timer"
      >
        <RotateCcw size={20} />
      </motion.button>

      {/* Play/Pause Button (Primary) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRunning ? pause : start}
        className={cn(
          "w-20 h-20 flex items-center justify-center rounded-[2rem] transition-colors outline-none",
          "bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-900/50 border border-white/10"
        )}
        aria-label={isRunning ? "Pause Timer" : "Start Timer"}
      >
        {isRunning ? (
          <Pause size={32} className="fill-current" />
        ) : (
          <Play size={32} className="fill-current ml-2" /* ml-2 visually centers the play triangle */ />
        )}
      </motion.button>

      {/* Skip Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={skip}
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-2xl transition-colors outline-none",
          "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5 shadow-sm"
        )}
        aria-label="Skip Phase"
      >
        <SkipForward size={20} />
      </motion.button>
    </div>
  );
};

export default TimerControls;