import { useState, } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, GripHorizontal, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniYoutubeProps {
  onClose: () => void;
}

export default function MiniYoutube({ onClose }: MiniYoutubeProps) {
  const [urlInput, setUrlInput] = useState(''); 
  const [videoId, setVideoId] = useState('jfKfPfyJRdk');
  
  const dragControls = useDragControls();
  // const constraintsRef = useRef(null);

  // Helper to extract the video ID from any YouTube link format
  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleLoadVideo = () => {
    const id = extractVideoId(urlInput);
    if (id) setVideoId(id);
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      className={cn(
        "fixed top-24 right-24 z-[60] flex flex-col",
        "w-[400px] h-[300px] bg-black/80 backdrop-blur-xl shadow-2xl border border-white/10 rounded-2xl overflow-hidden resize"
      )}
    >
      {/* Top Drag Handle Bar */}
      <div 
        className="h-10 bg-black/40 border-b border-white/5 flex justify-between items-center px-3 cursor-grab active:cursor-grabbing shrink-0"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="flex items-center gap-2 text-white/50 pointer-events-none">
          <GripHorizontal size={14} />
          <span className="text-xs font-semibold tracking-wider uppercase">Mini Player</span>
        </div>
        <button 
          onPointerDown={e => e.stopPropagation()} 
          onClick={onClose} 
          className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* URL Input Bar */}
      <div className="flex gap-2 p-2 shrink-0 bg-black/20" onPointerDown={e => e.stopPropagation()}>
        <input 
          type="text" 
          value={urlInput} 
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste YouTube Link..."
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-red-500/50"
        />
        <button 
          onClick={handleLoadVideo}
          className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center w-8"
        >
          <Play size={14} />
        </button>
      </div>

      {/* Video Embed */}
      <div className="flex-1 bg-black relative" onPointerDown={e => e.stopPropagation()}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0"
        ></iframe>
      </div>
    </motion.div>
  );
}