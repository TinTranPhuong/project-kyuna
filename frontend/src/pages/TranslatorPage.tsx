import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Store
import { useTranslatorStore } from '@/store/translatorStore';

// Components (Will show errors until implemented)
import PageViewer from '@/components/translator/PageViewer';
import ControlBar from '@/components/translator/ControlBar';
import ActionBar from '@/components/translator/ActionBar';
import FileUploader from '@/components/translator/FileUploader';
import OriginalPanel from '@/components/translator/OriginalPanel';
import TranslationProgress from '@/components/translator/TranslationProgress';

export default function TranslatorPage() {
  // Store actions and state
  const loadJobs = useTranslatorStore((state) => state.loadJobs);
  const pollJobStatus = useTranslatorStore((state) => state.pollJobStatus);
  const activeJob = useTranslatorStore((state) => state.activeJob);
  
  // Language selections
  const sourceLang = useTranslatorStore((state) => state.sourceLang);
  const setSourceLang = useTranslatorStore((state) => state.setSourceLang);
  const targetLang = useTranslatorStore((state) => state.targetLang);
  const setTargetLang = useTranslatorStore((state) => state.setTargetLang);

  // 1. On mount: load historical jobs
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // 2. Polling mechanism for active translation jobs
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (activeJob?.id && activeJob.status === 'processing') {
      intervalId = setInterval(() => {
        pollJobStatus(activeJob.id);
      }, 2000);
    }

    // Cleanup interval when component unmounts OR status changes to completed/failed
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeJob?.id, activeJob?.status, pollJobStatus]);

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-surface-900">
      
      {/* Left Column (65%) - Main Viewer Area */}
      <div className="flex-[65] flex flex-col h-full min-w-0 border-r border-white/10 relative">
        
        {/* State 1: Processing Job */}
        {activeJob?.status === 'processing' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <TranslationProgress />
          </div>
        ) : 
        /* State 2: Active/Completed Job with content */
        activeJob ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex-1 flex flex-col h-full"
          >
            {/* Top actions: Re-translate / Download ZIP */}
            <div className="p-4 shrink-0 bg-white/5 border-b border-white/10">
              <ActionBar />
            </div>

            {/* Main translated image viewer */}
            <div className="flex-1 overflow-hidden bg-black/20 p-4">
              <PageViewer />
            </div>

            {/* Bottom pagination / controls */}
            <div className="p-4 shrink-0 bg-white/5 border-t border-white/10">
              <ControlBar />
            </div>
          </motion.div>
        ) : (
          /* State 3: Idle / No Job */
          <div className="flex-1 flex items-center justify-center text-white/30 font-display">
            Upload a file or select a past job to start translating.
          </div>
        )}
      </div>

      {/* Right Column (35%) - Controls & Original Reference */}
      <div className="flex-[35] flex flex-col h-full min-w-0 bg-white/5 backdrop-blur-md shrink-0">
        
        {/* Language & Model Selectors (Always visible at top) */}
        <div className="p-4 border-b border-white/10 shrink-0 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Translation Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Source Language */}
            <div className="space-y-1">
              <label className="text-xs text-white/50" htmlFor="sourceLang">Source</label>
              <select 
                id="sourceLang"
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value)}
                className="glass-input text-sm py-2 cursor-pointer"
                disabled={activeJob?.status === 'processing'}
              >
                <option value="auto">Auto Detect</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            {/* Target Language */}
            <div className="space-y-1">
              <label className="text-xs text-white/50" htmlFor="targetLang">Target</label>
              <select 
                id="targetLang"
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value)}
                className="glass-input text-sm py-2 cursor-pointer"
                disabled={activeJob?.status === 'processing'}
              >
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Context Panel (Upload vs Original Viewer) */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeJob ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <FileUploader />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Original Reference</h4>
              <OriginalPanel />
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}