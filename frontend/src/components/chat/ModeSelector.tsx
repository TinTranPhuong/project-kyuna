import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { Zap, BrainCircuit, Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

export const ModeSelector: React.FC = () => {
  const { selectedMode, setMode } = useChatStore();

  const modes = [
    { id: 'fast', name: 'FAST', icon: Zap, desc: 'Im fast as fuck boi', color: 'text-blue-400' },
    { id: 'thinking', name: 'THINKING', icon: BrainCircuit, desc: 'Shhh, Im overthinking', color: 'text-purple-400' },
    { id: 'creative', name: 'CREATIVE', icon: Sparkles, desc: 'As Id say, use it responsibly', color: 'text-pink-400' },
    { id: 'agentic', name: 'AGENTIC', icon: Bot, desc: 'Me and da bois at 3AM executing your tasks', color: 'text-amber-400' }
  ] as const; 

  const currentMode = modes.find(m => m.id === selectedMode) || modes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 mb-1 mr-1 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none shrink-0" title={`Mode: ${currentMode.name}`}>
          <CurrentIcon size={16} className={currentMode.color} />
          <span className="text-sm font-medium">{currentMode.name}</span>
          <ChevronDown size={14} className="ml-1 opacity-50" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[220px] bg-surface-900 border border-white/10 rounded-xl p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          sideOffset={8}
          align="start"
        >
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Pipeline Mode
          </DropdownMenu.Label>

          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <DropdownMenu.Item
                key={mode.id}
                onClick={() => setMode(mode.id as any)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none transition-colors",
                  selectedMode === mode.id ? "bg-primary-600/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={mode.color || 'text-white/50'} />
                  <div className="flex flex-col">
                    <span className="font-medium inline-block">{mode.name}</span>
                    <span className="text-[10px] opacity-50 font-mono text-primary-300 inline-block">{mode.desc}</span>
                  </div>
                </div>
                {selectedMode === mode.id && <Check size={14} className="text-primary-400" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
