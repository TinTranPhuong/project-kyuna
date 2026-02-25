import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
//import { cn } from '@/lib/utils';

export const StopwatchTimer = () => {
  const { stopwatchMs, lapTimes } = useTimerStore();
  const [isRunning, setIsRunning] = useState(false);
  
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // --- Animation Frame Loop ---
  const animate = () => {
    const elapsed = Date.now() - startTimeRef.current;
    useTimerStore.setState({ stopwatchMs: elapsed });
    requestRef.current = requestAnimationFrame(animate);
  };

  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
    // Calculate start time based on already elapsed ms to allow resuming
    startTimeRef.current = Date.now() - stopwatchMs;
    requestRef.current = requestAnimationFrame(animate);
  };

  const pause = () => {
    if (!isRunning) return;
    setIsRunning(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const reset = () => {
    pause();
    useTimerStore.setState({ stopwatchMs: 0, lapTimes: [] });
  };

  const lap = () => {
    // We unshift (prepend) the new lap so it appears at the top of the list
    useTimerStore.setState((state) => ({ 
      lapTimes: [state.stopwatchMs, ...state.lapTimes] 
    }));
  };

  // Cleanup to prevent memory leaks if component unmounts while running
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- Formatting HH:MM:SS.ms ---
  const formatStopwatch = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10); // Format to 2 digits (00-99)

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(milliseconds)}`;
  };

  return (
    <div className="w-full flex flex-col items-center my-4 space-y-8">
      {/* Time Display */}
      <div className="font-display text-6xl md:text-7xl font-bold text-white tracking-tighter tabular-nums drop-shadow-md">
        {formatStopwatch(stopwatchMs)}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={lap}
          disabled={!isRunning}
          className="w-12 h-12 flex items-center justify-center rounded-2xl transition-colors outline-none bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Flag size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRunning ? pause : start}
          className="w-16 h-16 flex items-center justify-center rounded-[2rem] transition-colors outline-none bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-900/50 border border-white/10"
        >
          {isRunning ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1.5" />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="w-12 h-12 flex items-center justify-center rounded-2xl transition-colors outline-none bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
        >
          <RotateCcw size={20} />
        </motion.button>
      </div>

      {/* Laps List */}
      <div className="w-full max-w-[240px] h-32 overflow-y-auto pr-2 custom-scrollbar">
        {lapTimes.length > 0 ? (
          <ul className="space-y-2">
            {lapTimes.slice(0, 5).map((lapTime, index) => {
              // Calculate actual lap number since we prepended to the array
              const lapNumber = lapTimes.length - index;
              return (
                <li key={lapNumber} className="flex justify-between items-center text-sm px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-white/50 font-medium">Lap {lapNumber}</span>
                  <span className="text-white font-mono">{formatStopwatch(lapTime)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-white/30 italic">
            No laps recorded
          </div>
        )}
      </div>
    </div>
  );
};

export default StopwatchTimer;