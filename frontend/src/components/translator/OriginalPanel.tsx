import { useRef, useEffect } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { cn } from '@/lib/utils';

export const OriginalPanel = () => {
  const { activeJobId, currentPage, totalPages, goToPage } = useTranslatorStore();
  const activeRef = useRef<HTMLButtonElement>(null);
  
  const baseUrl = import.meta.env.VITE_API_URL;

  // Auto-scroll to keep the active thumbnail in view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  // If no job is selected, hide the panel or show an empty state
  if (!activeJobId) return null;

  // Create an array [1, 2, 3... totalPages] to map over
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="w-32 flex-shrink-0 bg-surface-950 border-l border-white/5 overflow-y-auto custom-scrollbar flex flex-col p-2 gap-3">
      {pages.map((pageNum) => {
        const isActive = pageNum === currentPage;
        // Construct the URL to fetch the original image
        const imageUrl = `${baseUrl}/translate/jobs/${activeJobId}/pages/${pageNum}/original`;

        return (
          <button
            key={pageNum}
            ref={isActive ? activeRef : null}
            onClick={() => goToPage(pageNum)}
            className={cn(
              "relative group w-full aspect-[2/3] rounded-md overflow-hidden border-2 transition-all shrink-0",
              isActive 
                ? "border-primary-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                : "border-transparent hover:border-white/20"
            )}
          >
            <img 
              src={imageUrl} 
              alt={`Original Page ${pageNum}`} 
              className={cn(
                "w-full h-full object-cover transition-opacity",
                isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80"
              )}
              loading="lazy"
            />
            
            {/* Page Number Badge */}
            <div className={cn(
              "absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-md",
              isActive ? "bg-primary-500 text-white" : "bg-black/80 text-white/80"
            )}>
              {pageNum}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default OriginalPanel;