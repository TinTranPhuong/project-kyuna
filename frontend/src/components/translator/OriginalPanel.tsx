import { useEffect, useState } from 'react';
import { useTranslatorStore } from '@/store/translatorStore';
import { translatorService } from '@/services/translator.service';
import { cn } from '@/lib/utils';
import { Loader2, Image as ImageIcon, Plus } from 'lucide-react';

const Thumbnail = ({ 
  jobId, 
  pageNumber, 
  isActive, 
  onClick 
}: { 
  jobId: string, 
  pageNumber: number, 
  isActive: boolean, 
  onClick: () => void 
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const blob = await translatorService.getPageBlob(jobId, pageNumber, 'original');
        if (active) {
          const url = URL.createObjectURL(blob);
          setSrc(url);
          setLoading(false);
        }
      } catch (e) {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; if (src) URL.revokeObjectURL(src); };
  }, [jobId, pageNumber]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[2/3] overflow-hidden rounded-sm border transition-all focus:outline-none",
        isActive 
          ? "border-primary-500 ring-2 ring-primary-500 z-10" 
          : "border-white/10 hover:border-white/40 hover:brightness-110"
      )}
      title={`Jump to page ${pageNumber}`}
    >
      {loading ? (
        <div className="flex h-full w-full items-center justify-center bg-surface-800">
          <Loader2 className="h-4 w-4 animate-spin text-white/20" />
        </div>
      ) : src ? (
        <img 
          src={src} 
          alt={`Page ${pageNumber}`} 
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-800">
          <ImageIcon className="h-5 w-5 text-white/10" />
        </div>
      )}
      
      <div className={cn(
        "absolute bottom-0 right-0 px-1 py-0.5 text-[8px] font-mono font-bold rounded-tl-sm leading-none",
        isActive ? "bg-primary-500 text-black" : "bg-black/60 text-white backdrop-blur-sm"
      )}>
        {pageNumber}
      </div>
    </button>
  );
};

export const OriginalPanel = () => {
  const { activeJobId, totalPages, currentPage, goToPage, selectJob } = useTranslatorStore();

  if (!activeJobId) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // This resets the UI state to show the FileUploader again
  const handleNewUpload = () => {
    selectJob(null as any); 
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface-950">
      
      {/* Header with New Button */}
      <div className="p-3 border-b border-white/10 bg-surface-950/95 backdrop-blur sticky top-0 z-20 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-white/40 uppercase tracking-wider">
            Content
          </h3>
          <span className="text-[14px] bg-white/5 px-2 py-0.5 rounded-full text-white/40 font-mono">
            {pages.length}P
          </span>
        </div>

        {/* NEW UPLOAD BUTTON */}
        <button 
          onClick={handleNewUpload}
          className="flex items-center gap-1 px-2 py-1 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider rounded border border-primary-500/20 transition-colors"
          title="Upload a new file"
        >
          <Plus size={12} />
          <span>NEW</span>
        </button>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* YOUR LAYOUT: Preserved exactly as you wrote it */}
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
          {pages.map((pageNum) => (
            <Thumbnail
              key={`${activeJobId}-${pageNum}`}
              jobId={activeJobId}
              pageNumber={pageNum}
              isActive={currentPage === pageNum}
              onClick={() => goToPage(pageNum)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OriginalPanel;