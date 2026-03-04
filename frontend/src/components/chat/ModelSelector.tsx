import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { chatService } from '@/services/chat.service';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const ModelSelector = () => {
  const { selectedModel, setModel } = useChatStore();

  // Fetch available models from your local AI server
  const { data: models, isLoading } = useQuery({
    queryKey: ['chat-models'],
    queryFn: () => chatService.getModels(),
  });

  const currentModel = models?.find((m) => m.id === selectedModel);

  if (isLoading) {
    return (
      <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg border border-white/5" />
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all outline-none group">
          <Cpu size={16} className="text-primary-400" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-bold text-white leading-none">
              {currentModel?.name || 'Select Model'}
            </span>
            {currentModel?.size && (
              <span className="text-[10px] text-white/40 font-mono">
                {currentModel.size}
              </span>
            )}
          </div>
          <ChevronDown size={14} className="text-white/20 group-hover:text-white/60 transition-colors ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[220px] bg-surface-900 border border-white/10 rounded-xl p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          sideOffset={8}
          align="start"
        >
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Available Mode
          </DropdownMenu.Label>
          
          {models?.map((model) => (
            <DropdownMenu.Item
              key={model.id}
              onClick={() => setModel(model.id)}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer outline-none transition-colors",
                selectedModel === model.id ? "bg-primary-600/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-[10px] opacity-50 font-mono">{model.size} • {model.context_window}k ctx</span>
              </div>
              {selectedModel === model.id && <Check size={14} className="text-primary-400" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};