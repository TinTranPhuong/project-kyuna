import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  label?: string;
  showPercent?: boolean;
  isStriped?: boolean;
  className?: string;
}

export const ProgressBar = ({
  value,
  color = 'bg-primary-500',
  label,
  showPercent = false,
  isStriped = false,
  className,
}: ProgressBarProps) => {
  // Ensure value stays between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Label and Percentage Row */}
      {(label || showPercent) && (
        <div className="flex justify-between items-end px-1">
          {label && (
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              {label}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-mono font-bold text-primary-400">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div className="h-3 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden relative">
        {/* Progress Fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out relative",
            color,
            isStriped && "overflow-hidden"
          )}
          style={{ width: `${clampedValue}%` }}
        >
          {/* Animated Stripes Overlay */}
          {isStriped && clampedValue < 100 && (
            <div 
              className="absolute inset-0 animate-progress-stripes bg-[length:30px_30px]"
              style={{
                backgroundImage: `linear-gradient(
                  45deg, 
                  rgba(255, 255, 255, 0.15) 25%, 
                  transparent 25%, 
                  transparent 50%, 
                  rgba(255, 255, 255, 0.15) 50%, 
                  rgba(255, 255, 255, 0.15) 75%, 
                  transparent 75%, 
                  transparent
                )`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;