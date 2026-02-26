import { useState } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { RefreshCw, Eye, EyeOff, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActionBar = () => {
  const { 
    activeJobId, 
    jobs, 
    retranslate, 
    showOriginal, 
    toggleShowOriginal, 
    downloadZip 
  } = useTranslatorStore();
  
  const [isDownloading, setIsDownloading] = useState(false);

  const activeJob = jobs.find((j) => j.id === activeJobId);
  const isProcessing = activeJob?.status === 'processing';

  const handleDownload = async () => {
    if (!activeJobId) return;
    setIsDownloading(true);
    try {
      // The store now handles the blob creation and anchor click!
      await downloadZip(activeJobId);
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      alert('Failed to download the translation. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!activeJobId) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
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

      <button
        onClick={toggleShowOriginal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-900 border border-white/10 text-white/80 hover:bg-surface-800 hover:text-white transition-colors"
      >
        {showOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
        {showOriginal ? 'Hide Original' : 'Show Original'}
      </button>

      <button
        onClick={handleDownload}
        disabled={isDownloading || isProcessing}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
          isDownloading || isProcessing
            ? "bg-primary-500/20 border-primary-500/20 text-primary-500/50 cursor-not-allowed"
            : "bg-primary-500 border-primary-400 text-white hover:bg-primary-600 hover:border-primary-500 shadow-lg shadow-primary-500/20"
        )}
      >
        {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {isDownloading ? 'Downloading...' : 'Download ZIP'}
      </button>
    </div>
  );
};

export default ActionBar;