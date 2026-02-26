import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakTrackerProps {
  currentStreak?: number;
  longestStreak?: number;
  // Array of 7 booleans representing the past 7 days (index 6 is today)
  pastWeek?: boolean[];
  hasSessionToday?: boolean;
}

export const StreakTracker = ({ 
  currentStreak = 7, 
  longestStreak = 14, 
  pastWeek = [true, false, true, true, true, true, true],
  hasSessionToday = true
}: StreakTrackerProps) => {
  
  // Abbreviated days ending on today
  const getDaysArray = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      result.unshift(days[(today - i + 7) % 7]);
    }
    return result;
  };
  
  const dayLabels = getDaysArray();

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-rose-500/5 border border-orange-500/10">
      <div className="flex items-center gap-3 mb-1">
        <Flame size={28} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{currentStreak} Day Streak</h2>
          <p className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider mt-0.5">
            Longest: {longestStreak} Days
          </p>
        </div>
      </div>

      <div className="flex justify-between items-end mt-8">
        {pastWeek.map((hasCompleted, index) => {
          const isToday = index === 6;
          const isPulsing = isToday && hasSessionToday;

          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="relative">
                {/* Pulse Ring for today */}
                {isPulsing && (
                  <div className="absolute inset-0 rounded-full bg-orange-500/40 animate-ping scale-150" />
                )}
                
                {/* The Circle */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 relative",
                  hasCompleted 
                    ? "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]" 
                    : "bg-surface-950 border-2 border-white/10"
                )}>
                  {hasCompleted && <Flame size={14} className="text-white opacity-90" />}
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-bold",
                isToday ? "text-orange-400" : "text-white/30"
              )}>
                {dayLabels[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};