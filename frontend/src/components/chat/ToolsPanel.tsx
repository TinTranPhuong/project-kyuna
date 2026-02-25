import React from 'react';
import { Globe, Code, Image as ImageIcon, Database, Lock } from 'lucide-react';
//import { cn } from '@/lib/utils';

interface ToolItemProps {
  icon: React.ReactNode;
  name: string;
  description: string;
}

const ToolItem = ({ icon, name, description }: ToolItemProps) => (
  <div className="relative group p-3 rounded-xl border border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed grayscale">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-white/5 text-white/40">
        {icon}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/60">{name}</span>
          <span className="text-[9px] font-bold bg-white/10 text-white/40 px-1.5 py-0.5 rounded uppercase tracking-tighter">
            Soon
          </span>
        </div>
        <p className="text-xs text-white/30 leading-snug mt-1">{description}</p>
      </div>
    </div>
    
    {/* Disabled Toggle Switch */}
    <div className="absolute top-3 right-3 w-8 h-4 bg-white/5 rounded-full border border-white/10 flex items-center px-0.5">
      <div className="w-3 h-3 bg-white/10 rounded-full" />
    </div>
  </div>
);

export const ToolsPanel = () => {
  return (
    <div className="flex flex-col h-full bg-surface-950/20 border-l border-white/5 w-72 shrink-0 p-4">
      <div className="flex items-center gap-2 mb-6">
        <Lock size={14} className="text-white/20" />
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Agent Capabilities</h3>
      </div>

      <div className="space-y-3 overflow-y-auto custom-scrollbar">
        <ToolItem 
          icon={<Globe size={18} />} 
          name="Web Search" 
          description="Browse the web for real-time information and citations."
        />
        <ToolItem 
          icon={<Code size={18} />} 
          name="Code Interpreter" 
          description="Execute Python scripts in a sandboxed environment."
        />
        <ToolItem 
          icon={<ImageIcon size={18} />} 
          name="Image Analysis" 
          description="Vision support for screenshots and local images."
        />
        <ToolItem 
          icon={<Database size={18} />} 
          name="Custom Context" 
          description="RAG support for local Markdown or PDF files."
        />
      </div>

      <div className="mt-auto pt-4 border-t border-white/5">
        <p className="text-[10px] text-white/20 italic text-center leading-relaxed">
          Tool injection will be enabled once agentic handoff logic is finalized in Phase 2.
        </p>
      </div>
    </div>
  );
};