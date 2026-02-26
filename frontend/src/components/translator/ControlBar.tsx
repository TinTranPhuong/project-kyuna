import React, { useState, useEffect } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ControlBar = () => {
  const { currentPage, totalPages, nextPage, prevPage, goToPage, activeJobId } = useTranslatorStore();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());

  // Keep local input state in sync if the page changes via thumbnails or keyboard
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handleJumpSubmit = () => {
    const page = parseInt(inputValue, 10);
    // Validate jump input
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      goToPage(page);
    } else {
      // Revert if invalid input
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

  return (
    <div className="flex items-center justify-center gap-4 bg-surface-900 border border-white/5 p-2 rounded-xl shadow-lg w-fit mx-auto mt-4">
      <button
        onClick={prevPage}
        disabled={currentPage <= 1}
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="w-32 flex justify-center">
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
            style={{ appearance: 'textfield' }} // Hides native number arrows
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
    </div>
  );
};

export default ControlBar;