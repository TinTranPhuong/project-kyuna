import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { AlertTriangle } from 'lucide-react';

export const ConfirmationModal: React.FC = () => {
  const { agentState, confirmTool, cancelTool } = useChatStore();
  
  if (!agentState || !agentState.pendingConfirmation) return null;
  
  const { tool, args } = agentState.pendingConfirmation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-amber-500">
          <AlertTriangle size={24} />
          <h3 className="text-xl font-bold text-white">Action Required</h3>
        </div>
        
        <p className="text-white/70 mb-4">
          The agent wants to execute <span className="text-amber-400 font-mono text-sm bg-amber-400/10 px-1.5 rounded">{tool}</span>. 
          Do you want to proceed?
        </p>
        
        <div className="bg-black/40 border border-white/5 rounded-lg p-3 overflow-auto max-h-48 custom-scrollbar mb-6">
          <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Arguments</h4>
          <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap flex-1 min-w-0">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => cancelTool()}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium border border-white/5"
          >
            Skip Action
          </button>
          <button
            onClick={() => confirmTool()}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors font-bold"
          >
            Approve & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
