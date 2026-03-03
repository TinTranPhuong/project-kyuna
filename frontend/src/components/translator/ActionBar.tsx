import { useTranslatorStore } from '@/store/translatorStore';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActionBar = () => {
  const { activeJobId, jobs, retranslate } = useTranslatorStore();
  
  const activeJob = jobs.find((j) => j.id === activeJobId);
  const isProcessing = activeJob?.status === 'processing';

  if (!activeJobId) return null;

  return (
    <button
      onClick={() => retranslate(activeJobId)}
      disabled={isProcessing}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
        isProcessing 
          ? "bg-surface-800 border-white/5 text-white/30 cursor-not-allowed" 
          : "bg-surface-900 border-white/10 text-white/80 hover:bg-surface-800 hover:text-white"
      )}
    >
      <RefreshCw size={16} className={cn(isProcessing && "animate-spin")} />
      Re-translate
    </button>
  );
};

export default ActionBar;