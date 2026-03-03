import React from 'react';
import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseState } from '@/types/translator.types';

interface PhaseProgressProps {
  phases: PhaseState[];
}

export const PhaseProgress: React.FC<PhaseProgressProps> = ({ phases }) => {
  if (!phases || phases.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 w-full max-w-[280px] bg-surface-950/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl z-20 pointer-events-none">
      <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">
        Pipeline Status
      </h4>
      
      <div className="flex flex-col gap-3">
        {phases.map((phase, index) => {
          const isWaiting = phase.status === 'waiting';
          const isRunning = phase.status === 'running';
          const isDone = phase.status === 'done';
          const isFailed = phase.status === 'failed';

          return (
            <div key={phase.stage} className="flex items-start gap-3 relative">
              {/* Connector Line (hidden on the last item) */}
              {index < phases.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-[9px] top-6 w-[2px] h-[calc(100%-8px)] -translate-x-1/2 rounded-full",
                    isDone ? "bg-green-500/30" : "bg-white/10"
                  )} 
                />
              )}

              {/* Status Icon */}
              <div className="relative z-10 bg-surface-950 rounded-full flex-shrink-0 mt-0.5">
                {isWaiting && <Circle size={18} className="text-white/20" />}
                
                {isRunning && (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping" />
                    <Loader2 size={18} className="text-teal-400 animate-spin relative z-10" />
                  </div>
                )}
                
                {isDone && <CheckCircle2 size={18} className="text-green-500" />}
                
                {isFailed && <XCircle size={18} className="text-red-500" />}
              </div>

              {/* Text Content */}
              <div className="flex flex-col min-w-0 pb-1">
                <span className={cn(
                  "text-sm font-medium truncate transition-colors",
                  isWaiting && "text-white/40",
                  isRunning && "text-white drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]",
                  isDone && "text-green-400",
                  isFailed && "text-red-400"
                )}>
                  {phase.name}
                </span>
                
                {/* Detail text (e.g., "8/12 bubbles") */}
                {phase.detail && (
                  <span className={cn(
                    "text-xs font-mono mt-0.5",
                    isRunning ? "text-teal-400/80" : "text-white/40"
                  )}>
                    {phase.detail}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseProgress;