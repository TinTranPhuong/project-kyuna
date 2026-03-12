import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Minus, 
  ChevronLeft, ChevronRight, 
  MessageCircle, Type, Image as ImageIcon, 
  RefreshCw, Loader2 
} from 'lucide-react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';
import { usePhaseStream } from '@/hooks/usePhaseStream';
import BubbleDotOverlay from './BubbleDotOverlay';
import { CanvasOverlay } from './CanvasOverlay'; 
import PhaseProgress from './PhaseProgress';
import { translatorService } from '@/services/translator.service';

export const PageViewer = () => {
  const { 
    activeJobId, currentPage, totalPages, nextPage, prevPage,
    overlayMode, setOverlayMode, pollJobStatus, pageRegions,
    retranslate
  } = useTranslatorStore();

  const { phases, regions: streamRegions, isDone: streamDone, isFailed } = usePhaseStream(activeJobId, currentPage);
  
  const storeRegions = activeJobId ? pageRegions[currentPage] : [];
  const regions = (streamRegions?.length > 0 ? streamRegions : storeRegions) || [];
  
  const hasRegions = regions.length > 0;
  const isDone = streamDone || hasRegions;

  const [imgNaturalW, setImgNaturalW] = useState(0);
  const [imgNaturalH, setImgNaturalH] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [authenticatedImageUrl, setAuthenticatedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeJobId) return;
    pollJobStatus(activeJobId);
    const interval = setInterval(() => {
      const currentJob = useTranslatorStore.getState().jobs.find(j => j.id === activeJobId);
      if (currentJob?.status !== 'completed' && currentJob?.status !== 'failed') {
        pollJobStatus(activeJobId);
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [activeJobId, pollJobStatus]);

  useEffect(() => {
    if (!activeJobId) return;
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      setIsLoading(true);
      try {
        const blob = await translatorService.getPageBlob(activeJobId, currentPage, 'original');
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setAuthenticatedImageUrl(objectUrl);
        }
      } catch (error) {
        console.error("Failed to fetch image", error);
      }
    };
    fetchImage();
    return () => { isMounted = false; if(objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [currentPage, activeJobId]);

  useEffect(() => {
    setZoom(1);
    setImgNaturalW(0);
    setImgNaturalH(0);
  }, [currentPage, activeJobId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
  }, [nextPage, prevPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((p) => Math.min(Math.max(0.1, p + (e.deltaY > 0 ? -0.1 : 0.1)), 4.0));
    }
  };

  const handleRetranslate = async () => {
    if (activeJobId && confirm("Are you sure you want to re-translate this job?")) {
      await retranslate(activeJobId);
    }
  };

  if (!activeJobId) {
    return (
      // Clean transparent empty state
      <div className="flex-1 flex items-center justify-center bg-transparent border border-white/5 rounded-xl">
        <ImageIcon className="text-white/20" size={48} />
      </div>
    );
  }

  const SectionLabel = ({ text }: { text: string }) => (
    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-2 select-none">
      {text}
    </span>
  );

  return (
    // UI layout with a fully transparent background to maintain visibility of the original image
    <div className="flex flex-row h-full bg-transparent rounded-xl border border-white/10 overflow-hidden relative shadow-2xl">
      
      {/* --- SIDEBAR --- */}
      {/* Dark tint (bg-black/60) only, NO BLUR. Ensures buttons are readable. */}
      <div className="w-24 flex-shrink-0 bg-black/60 border-r border-white/10 flex flex-col items-center py-6 gap-6 z-30 select-none overflow-y-auto custom-scrollbar">
        
        {/* 1. SIZE SECTION */}
        <div className="flex flex-col items-center w-full">
          <SectionLabel text="Size" />
          <div className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-1 w-16 border border-white/5">
            <button 
              onClick={() => setZoom(z => Math.min(4.0, z + 0.1))} 
              className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors w-full flex justify-center"
            >
              <Plus size={16} />
            </button>
            <span className="text-[10px] font-mono text-white/80 py-1">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} 
              className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors w-full flex justify-center"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* 2. PAGE SECTION */}
        <div className="flex flex-col items-center w-full">
          <SectionLabel text="Page" />
          <div className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-1 w-16 border border-white/5">
            <button 
              onClick={prevPage} 
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white disabled:opacity-30 transition-colors w-full flex justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center leading-none py-1 gap-0.5">
              <span className="text-xs font-mono font-bold text-white/90">{currentPage}</span>
              <div className="h-px w-3 bg-white/20 my-0.5"></div>
              <span className="text-[9px] font-mono text-white/40">{totalPages}</span>
            </div>
            <button 
              onClick={nextPage} 
              disabled={currentPage >= totalPages}
              className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white disabled:opacity-30 transition-colors w-full flex justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* 3. STYLE SECTION */}
        <div className="flex flex-col items-center w-full px-3">
          <SectionLabel text="Style" />
          <div className="flex flex-col gap-2 w-full">
            <button 
              onClick={() => setOverlayMode('dots')}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all border", 
                overlayMode === 'dots' 
                  ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                  : "bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/10"
              )}
              title="Interactive Dots"
            >
              <MessageCircle size={18} className={cn(overlayMode === 'dots' && "fill-green-500/20")} />
            </button>
            
            <button 
              onClick={() => setOverlayMode('text')}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all border", 
                overlayMode === 'text' 
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                  : "bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/10"
              )}
              title="Translated Text"
            >
              <Type size={18} />
            </button>

            <button 
              onClick={() => setOverlayMode('original')}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-all border", 
                overlayMode === 'original' 
                  ? "bg-white/20 text-white border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
                  : "bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/10"
              )}
              title="Original Image"
            >
              <ImageIcon size={18} />
            </button>
          </div>
        </div>

        {/* 4. ACTION SECTION */}
        <div className="flex flex-col items-center w-full px-3">
          <SectionLabel text="Action" />
          <button 
            onClick={handleRetranslate}
            className="p-2.5 rounded-xl text-white/40 hover:text-primary-400 hover:bg-primary-500/10 transition-all border border-white/5 hover:border-primary-500/20 w-full flex justify-center"
            title="Re-translate Job"
          >
            <RefreshCw size={18} />
          </button>
        </div>

      </div>

      {/* --- IMAGE AREA --- */}
      <div 
        className="flex-1 overflow-auto custom-scrollbar relative bg-transparent block" 
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        )}
        
        {!isDone && !isFailed && !hasRegions && (
          <div className="absolute top-6 left-6 z-30">
            <PhaseProgress phases={phases} />
          </div>
        )}

        {authenticatedImageUrl && (
          <div className="min-h-full min-w-full flex items-center justify-center p-4">
            <div 
              className="relative transition-transform duration-150 ease-out origin-center will-change-transform"
              style={{ 
                transform: `scale(${zoom})`,
                display: 'inline-block', 
                width: 'max-content'
              }}
            >
              <img
                src={authenticatedImageUrl}
                alt={`Page ${currentPage}`}
                onLoad={(e) => {
                  setIsLoading(false);
                  setImgNaturalW((e.target as HTMLImageElement).naturalWidth);
                  setImgNaturalH((e.target as HTMLImageElement).naturalHeight);
                }}
                className="block w-auto h-auto max-w-full max-h-[95vh] select-none shadow-2xl rounded-sm" 
                draggable={false}
              />

              {overlayMode === 'dots' && (
                <BubbleDotOverlay
                  regions={regions as any}
                  imageWidth={imgNaturalW}
                  imageHeight={imgNaturalH}
                  visible={true} 
                />
              )}
              
              {overlayMode === 'text' && (
                <CanvasOverlay
                  regions={regions as any}
                  imageWidth={imgNaturalW}
                  imageHeight={imgNaturalH}
                  visible={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageViewer;