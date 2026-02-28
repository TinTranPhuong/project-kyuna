import React from 'react';
import { Globe, Code, Image as ImageIcon, Database, Lock } from 'lucide-react';

interface ToolItemProps {
  icon: React.ReactNode;
  name: string;
}

// Drastically simplified UI: Just an icon, name, and a sleek "SOON" badge
const ToolItem = ({ icon, name }: ToolItemProps) => (
  <li className="flex items-center justify-between px-2 py-2 text-xs text-white/50 hover:bg-white/5 rounded-lg transition-colors cursor-not-allowed group">
    <div className="flex items-center gap-2.5">
      <div className="text-white/30">{icon}</div>
      <span className="font-medium">{name}</span>
    </div>
    <span className="text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">
      Soon
    </span>
  </li>
);

export const ToolsPanel = () => {
  return (
    // Removed h-full and fixed widths so it stacks perfectly inside the parent column
    <div className="p-4 bg-surface-900/20 border-t border-white/5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Lock size={12} className="text-white/20" />
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
          Agent Capabilities
        </h3>
      </div>

      <ul className="space-y-0.5">
        <ToolItem icon={<Globe size={14} />} name="Web Search" />
        <ToolItem icon={<Code size={14} />} name="Code Interpreter" />
        <ToolItem icon={<ImageIcon size={14} />} name="Image Analysis" />
        <ToolItem icon={<Database size={14} />} name="Custom Context" />
      </ul>
    </div>
  );
};

export default ToolsPanel;