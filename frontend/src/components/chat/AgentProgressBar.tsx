import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { Loader2, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AgentProgressBar: React.FC = () => {
  const { agentState } = useChatStore();
  
  if (!agentState || agentState.planStatus !== 'approved' || agentState.planSteps.length === 0 || !agentState.isRunning) return null;

  return (
    <div className="bg-black/10 border border-white/5 rounded-xl p-3 my-2 text-sm flex flex-col gap-2 relative overflow-hidden">
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1 mb-1">Execution Progress</h4>
      <div className="flex flex-col gap-2">
        {agentState.planSteps.map((step, idx) => {
          const runStatus = agentState.toolStatus[step.tool_name]; // "running", "done", "error", undefined
          return (
            <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
              <div className="mt-0.5">
                {!runStatus && <PlayCircle size={16} className="text-white/20" />}
                {runStatus === 'running' && <Loader2 size={16} className="text-primary-400 animate-spin" />}
                {runStatus === 'done' && <CheckCircle size={16} className="text-green-500" />}
                {runStatus === 'error' && <AlertTriangle size={16} className="text-rose-500" />}
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center">
                   <div className="flex gap-2 items-center">
                     <span className="text-white font-medium text-xs bg-black/40 px-1.5 rounded">{step.tool_name}</span>
                     <span className={cn(
                       "text-sm line-clamp-1",
                       runStatus === "done" ? "text-white/40" : "text-white/80"
                     )}>{step.description}</span>
                   </div>
                </div>
                {/* Result block if any */}
                {runStatus === 'done' && agentState.toolResults[step.tool_name] && (
                  <div className="mt-2 p-2 bg-black/30 rounded border border-white/5 text-white/60 text-xs overflow-hidden max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                     {typeof agentState.toolResults[step.tool_name] === 'string' 
                         ? agentState.toolResults[step.tool_name] 
                         : JSON.stringify(agentState.toolResults[step.tool_name], null, 2)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
