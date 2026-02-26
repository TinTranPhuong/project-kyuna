import React, { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';

export const PageViewer = () => {
  const { 
    activeJobId, 
    currentPage, 
    totalPages,
    nextPage, 
    prevPage 
  } = useTranslatorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Derive the correct URL based on state
  const baseUrl = import.meta.env.VITE_API_URL;
  const imageType = showOriginal ? 'original' : 'translated';
  const imageUrl = activeJobId 
    ? `${baseUrl}/translate/jobs/${activeJobId}/pages/${currentPage}/${imageType}`
    : null;

  // Reset states when the page changes
  useEffect(() => {
    setIsLoading(true);
    setZoom(1);
  }, [currentPage, showOriginal, activeJobId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft') prevPage();
  }, [nextPage, prevPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(0.5, prev + zoomFactor), 4)); // Clamp zoom between 0.5x and 4x
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
    <div className="flex flex-col h-full bg-surface-900 rounded-xl border border-white/5 overflow-hidden relative">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between p-2 rounded-lg bg-surface-950/80 backdrop-blur border border-white/10 shadow-xl">
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-white/40 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="text-xs font-medium text-white/40">
          Page {currentPage} / {totalPages}
        </div>

        <button 
          onClick={() => setShowOriginal(!showOriginal)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
            showOriginal ? "bg-primary-500/20 text-primary-400" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <Eye size={14} />
          {showOriginal ? 'Viewing Original' : 'Viewing Translated'}
        </button>
      </div>

      {/* Image Viewing Area */}
      <div 
        className="flex-1 overflow-auto custom-scrollbar relative flex items-center justify-center bg-surface-950/50"
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900/50 z-0">
            <Loader2 size={32} className="animate-spin text-primary-500 opacity-50" />
          </div>
        )}
        
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Page ${currentPage}`}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)} // Need to handle broken images gracefully
            className="transition-transform duration-200 ease-out origin-center"
            style={{ 
              transform: `scale(${zoom})`,
              display: isLoading ? 'none' : 'block'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PageViewer;