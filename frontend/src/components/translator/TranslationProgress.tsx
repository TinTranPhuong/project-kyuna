import { useState, useEffect } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { Loader2 } from 'lucide-react';

export const TranslationProgress = () => {
  // Destructure totalPages directly from the store
  const { activeJobId, jobs, totalPages } = useTranslatorStore();
  const [mountTime] = useState(Date.now());
  const [eta, setEta] = useState<string>('Calculating...');

  // Extract the active job
  const activeJob = jobs.find((j) => j.id === activeJobId);

  // Cast to any to safely extract completed_pages without modifying your service interfaces
  const completedPages = (activeJob as any)?.completed_pages || (activeJob as any)?.completedPages || 0;
  const isProcessing = activeJob?.status === 'processing';

  // Calculate ETA based on elapsed time and pages processed
  useEffect(() => {
    if (!isProcessing || completedPages === 0) {
      setEta('Calculating...');
      return;
    }

    const elapsedMs = Date.now() - mountTime;
    const msPerPage = elapsedMs / completedPages;
    const pagesRemaining = Math.max(0, totalPages - completedPages);
    const msRemaining = msPerPage * pagesRemaining;

    const remainingSeconds = Math.ceil(msRemaining / 1000);

    if (remainingSeconds < 60) {
      setEta(`${remainingSeconds}s remaining`);
    } else {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      setEta(`${minutes}m ${seconds}s remaining`);
    }
  }, [completedPages, totalPages, isProcessing, mountTime]);

  if (!isProcessing) return null;

  const progressPercent = Math.min(((completedPages / Math.max(1, totalPages)) * 100), 100);

  return (
    <div className="w-full max-w-xl mx-auto mt-6 p-4 rounded-xl bg-surface-900/50 border border-primary-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-semibold animate-pulse">
            Translating page {completedPages} of {totalPages}...
          </span>
        </div>
        <span className="text-xs font-medium text-white/50 font-mono">
          {eta}
        </span>
      </div>

      <div className="h-2 w-full bg-surface-950 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]" />
        </div>
      </div>
    </div>
  );
};

export default TranslationProgress;