import { useTimerStore } from '@/store/timerStore';
import { cn } from '@/lib/utils';

export const SessionCounter = () => {
  const { sessionCount, phase } = useTimerStore();

  const totalSessions = 4;
  const currentInCycle = sessionCount % totalSessions;
  
  // If we've completed a multiple of 4 sessions and are currently on a break, the cycle is complete
  const isCycleComplete = currentInCycle === 0 && sessionCount > 0 && phase === 'long_break';

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {isCycleComplete ? (
        <span className="text-sm font-bold text-green-400 tracking-widest uppercase animate-pulse">
          Cycle Complete! 
        </span>
      ) : (
        <>
          {/* Progress Dots */}
          <div className="flex items-center space-x-3">
            {[...Array(totalSessions)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-colors duration-300",
                  i < currentInCycle
                    ? "bg-primary-500 border-primary-500 shadow-[0_0_8px_rgba(var(--primary-500),0.6)]"
                    : "bg-transparent border-white/20"
                )}
              />
            ))}
          </div>
          
          {/* Status Text */}
          <span className="text-xs font-medium text-white/50 uppercase tracking-widest">
            Session {currentInCycle === 0 && sessionCount > 0 ? totalSessions : currentInCycle} of {totalSessions}
          </span>
        </>
      )}
    </div>
  );
};

export default SessionCounter;