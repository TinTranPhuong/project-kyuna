import React, { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Image as ImageIcon, Loader2, MessageCircle, Type } from 'lucide-react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';
import { usePhaseStream } from '@/hooks/usePhaseStream';
import BubbleDotOverlay from './BubbleDotOverlay';
import { CanvasOverlay } from './CanvasOverlay';
import PhaseProgress from './PhaseProgress';
import { translatorService } from '@/services/translator.service';

export const PageViewer = () => {
  const { 
    activeJobId, 
    currentPage, 
    totalPages,
    nextPage, 
    prevPage,
    overlayMode,      // 'dots' | 'text' | 'original'
    setOverlayMode    // Action to change mode
  } = useTranslatorStore();

  const { phases, regions, isDone, isFailed } = usePhaseStream(activeJobId, currentPage);
  
  const [imgNaturalW, setImgNaturalW] = useState(0);
  const [imgNaturalH, setImgNaturalH] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  const [authenticatedImageUrl, setAuthenticatedImageUrl] = useState<string | null>(null);

  // Fetch Image (Always fetches 'original' now, since overlays handle the translation)
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      setIsLoading(true);
      try {
        // Always fetch original, overlays sit on top
        const blob = await translatorService.getPageBlob(activeJobId, currentPage, 'original');
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setAuthenticatedImageUrl(objectUrl);
        }
      } catch (error) {
        console.error("Failed to fetch authenticated image:", error);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setAuthenticatedImageUrl(null);
    };
  }, [currentPage, activeJobId]);

  // Reset zoom on page change
  useEffect(() => {
    setZoom(1);
    setImgNaturalW(0);
    setImgNaturalH(0);
  }, [currentPage, activeJobId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
  }, [nextPage, prevPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Zoom Handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(0.1, prev + zoomFactor), 2.0)); 
    }
  };

  if (!activeJobId) {
    return (
      <div className="flex-1 flex items-center justify-center border border-white/5 rounded-xl bg-surface-900/30 text-white/20">
        <ImageIcon size={48} className="opacity-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-row h-full bg-surface-900 rounded-xl border border-white/5 overflow-hidden relative">
      
      {/* LEFT SIDEBAR CONTROLS */}
      <div className="w-16 flex-shrink-0 bg-surface-950/80 backdrop-blur border-r border-white/10 shadow-xl flex flex-col items-center py-4 gap-6 z-10">
        
        {/* Zoom Controls */}
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} 
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          
          <span className="text-[10px] font-mono text-white/60 select-none">
            {Math.round(zoom * 100)}%
          </span>
          
          <button 
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} 
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        <div className="w-8 h-px bg-white/10" />

        {/* Page Info */}
        <div className="flex flex-col items-center gap-1 select-none">
          <span className="text-[9px] font-bold text-white/40 tracking-wider">PAGE</span>
          <span className="text-xs font-mono text-white/80">{currentPage}/{totalPages}</span>
        </div>

        <div className="w-8 h-px bg-white/10" />

        {/* NEW: Mode Toggles */}
        <div className="flex flex-col gap-3 w-full px-2">
          
          {/* Button 1: DOTS Mode */}
          <button 
            onClick={() => setOverlayMode(overlayMode === 'dots' ? 'original' : 'dots')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 group",
              overlayMode === 'dots'
                ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50" 
                : "text-white/40 hover:text-white hover:bg-white/10"
            )}
            title="Show Interactive Dots"
          >
            <MessageCircle size={20} className={cn(overlayMode === 'dots' && "fill-green-500/20")} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Dots</span>
          </button>

          {/* Button 2: TEXT Mode */}
          <button 
            onClick={() => setOverlayMode(overlayMode === 'text' ? 'original' : 'text')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 group",
              overlayMode === 'text'
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50" 
                : "text-white/40 hover:text-white hover:bg-white/10"
            )}
            title="Show Translated Text"
          >
            <Type size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Text</span>
          </button>

        </div>
      </div>

      {/* IMAGE VIEWING AREA */}
      <div 
        className="flex-1 overflow-auto custom-scrollbar relative flex items-center justify-center bg-surface-950/50"
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900/50 z-0">
            <Loader2 size={32} className="animate-spin text-primary-500 opacity-50" />
          </div>
        )}

        {/* Phase Progress Indicator */}
        {!isDone && !isFailed && (
          <div className="absolute top-6 left-6 z-30">
            <PhaseProgress phases={phases} />
          </div>
        )}
        
        {authenticatedImageUrl && (
          <div 
            className="relative transition-transform duration-200 ease-out origin-center"
            style={{ 
              transform: `scale(${zoom})`,
              display: isLoading ? 'none' : 'inline-block',
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
              onError={() => setIsLoading(false)}
              className="block max-w-full h-auto select-none" 
            />

            {/* CONDITIONAL OVERLAYS */}
            
            {/* Mode: DOTS */}
            {overlayMode === 'dots' && (
              <BubbleDotOverlay
                regions={regions as any}
                imageWidth={imgNaturalW}
                imageHeight={imgNaturalH}
                visible={true}
              />
            )}

            {/* Mode: TEXT */}
            {overlayMode === 'text' && (
              <CanvasOverlay
                regions={regions as any}
                imageWidth={imgNaturalW}
                imageHeight={imgNaturalH}
                visible={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageViewer;