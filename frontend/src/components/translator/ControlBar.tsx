import React, { useState, useEffect } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OverlayMode } from '@/types/translator.types';

export const ControlBar = () => {
  const { 
    currentPage, 
    totalPages, 
    nextPage, 
    prevPage, 
    goToPage, 
    activeJobId,
    // New Store Selectors
    overlayMode,
    setOverlayMode,
    pageRegions,
    // Legacy toggle for the original image is replaced by 'Original' mode, 
    // but we keep showOverlay/toggleShowOverlay if you still want a global "Hide" 
    // functionality independent of mode, or we can consider "Original" mode as hiding the overlay.
    // For this ticket, we strictly follow the requirement to replace the dots toggle.
  } = useTranslatorStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Keep local input state in sync
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleJumpSubmit = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    } else {
      setInputValue(currentPage.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleJumpSubmit();
    if (e.key === 'Escape') {
      setInputValue(currentPage.toString());
      setIsEditing(false);
    }
  };

  if (!activeJobId) return null;

  // Check if current page has regions 
  const regions = pageRegions[currentPage] || [];
  const hasRegions = regions.length > 0;

  // Mode configuration
  const MODES: { value: OverlayMode; label: string }[] = [
    { value: 'dots',     label: 'Dots'     },
    { value: 'text',     label: 'Text'     },
    { value: 'original', label: 'Original' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 bg-surface-900 border border-white/5 p-2 rounded-xl shadow-lg w-fit mx-auto mt-4">
      
      {/* Pagination Controls */}
      <button
        onClick={prevPage}
        disabled={currentPage <= 1}
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="w-28 sm:w-32 flex justify-center">
        {isEditing ? (
          <input
            type="number"
            min={1}
            max={totalPages}
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleJumpSubmit}
            onKeyDown={handleKeyDown}
            className="w-16 bg-surface-950 border border-primary-500/50 rounded px-1 py-0.5 text-center text-sm font-medium text-white outline-none"
            style={{ appearance: 'textfield' }} 
          />
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors cursor-text px-2 py-1 rounded hover:bg-white/5"
            title="Click to jump to page"
          >
            Page {currentPage} of {totalPages}
          </button>
        )}
      </div>

      <button
        onClick={nextPage}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      {/* NEW: 3-Way Segmented Control (Only visible when page has regions) */}
      {hasRegions && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          
          <div className="flex bg-surface-950/50 rounded-lg p-1 border border-white/10">
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setOverlayMode(value)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
                  ${overlayMode === value 
                    ? 'bg-primary-500/20 text-primary-300 shadow-sm ring-1 ring-primary-500/50' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  );
};

export default ControlBar;