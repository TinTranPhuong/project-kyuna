import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineRegion } from '@/types/translator.types';

interface BubbleDotOverlayProps {
  regions: PipelineRegion[];
  imageWidth: number;
  imageHeight: number;
  visible: boolean;
}

export const BubbleDotOverlay: React.FC<BubbleDotOverlayProps> = ({
  regions,
  imageWidth,
  imageHeight,
  visible
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Container sizing state
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [visible]);

  // Handle Copy to Clipboard
  const handleCopy = async (e: React.MouseEvent, text: string, index: number) => {
    e.stopPropagation(); // Prevent clicking the dot underneath
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveIndex(index === activeIndex ? null : index);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveIndex(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
    >
      {regions.map((region) => {
        // Validation check for strict safety
        if (!region || !region.bbox) return null;

        // 1. Calculate center point
        const [x1, y1, x2, y2] = region.bbox;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;

        // 2. Scale to container dimensions
        const scaleX = imageWidth > 0 ? containerWidth / imageWidth : 0;
        const scaleY = imageHeight > 0 ? containerHeight / imageHeight : 0;
        const displayX = cx * scaleX;
        const displayY = cy * scaleY;

        const isActive = activeIndex === region.index;
        
        // 3. Edge Clamping: If too close to top (< 80px), flip popup downwards
        const isTopEdge = displayY < 80;

        return (
          <React.Fragment key={region.index}>
            {/* The Interactive Dot */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`View translation for bubble ${region.index + 1}`}
              onMouseEnter={() => setActiveIndex(region.index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => {}} // Optional: Auto-show on tab focus? Kept to explicit Enter/Space per ticket
              onKeyDown={(e) => handleKeyDown(e, region.index)}
              className="absolute pointer-events-auto cursor-pointer focus:outline-none group"
              style={{
                left: displayX,
                top: displayY,
                transform: 'translate(-50%, -50%)',
                width: '14px',
                height: '14px',
              }}
            >
              {/* Dot Visuals */}
              <div className={cn(
                "w-full h-full rounded-full border-2 border-white transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.8)]",
                isActive 
                  ? "bg-green-400 scale-125" 
                  : "bg-green-500 opacity-80 animate-pulse group-hover:opacity-100 group-hover:scale-125 group-focus:ring-2 group-focus:ring-white group-focus:ring-offset-2 group-focus:ring-offset-black"
              )} />
            </div>

            {/* The Popup */}
            {isActive && (
              <div
                style={{ 
                  left: displayX, 
                  top: displayY + (isTopEdge ? 12 : -12) // Offset logic
                }}
                className={cn(
                  "absolute z-30 -translate-x-1/2 w-max max-w-[280px] min-w-[180px]",
                  "bg-surface-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4",
                  "pointer-events-auto animate-in fade-in zoom-in-95 duration-150 origin-center",
                  isTopEdge ? "mt-2" : "-translate-y-full mb-2"
                )}
                onMouseEnter={() => setActiveIndex(region.index)} // Keep open when hovering popup
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Header: Original Text */}
                <div className="mb-3">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Original</span>
                  <p className="text-white/90 text-sm leading-relaxed font-jp mt-0.5 select-text">
                    {region.japanese || <span className="italic text-white/30">No text detected</span>}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-white/10 mb-3" />

                {/* Footer: Translation + Copy */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-primary-400/80 tracking-wider">Translation</span>
                    
                    {/* Copy Button */}
                    {region.english && (
                      <button
                        onClick={(e) => handleCopy(e, region.english, region.index)}
                        className="text-white/30 hover:text-white transition-colors p-1 -mr-1 rounded-md active:bg-white/10"
                        title="Copy translation"
                      >
                        {copiedIndex === region.index ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <Check size={12} />
                            <span className="text-[9px] font-bold">COPIED</span>
                          </div>
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>

                  <p className={cn(
                    "text-sm leading-relaxed select-text",
                    region.english ? "text-primary-300 font-medium" : "text-white/30 italic"
                  )}>
                    {region.english || "Translation unavailable"}
                  </p>
                </div>

                {/* Decorative Arrow Tip */}
                <div 
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-950/95 border-r border-b border-white/10 rotate-45",
                    isTopEdge 
                      ? "top-[-7px] border-b-0 border-r-0 border-t border-l bg-surface-950" // Point Up
                      : "bottom-[-7px] bg-surface-950" // Point Down
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default BubbleDotOverlay;