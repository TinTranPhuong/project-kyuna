import { useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { X, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNoteStore, type Note } from '@/store/noteStore';

interface NotepadModalProps {
  note: Note;
}

export default function NotepadModal({ note }: NotepadModalProps) {
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);
  
  const updateNote = useNoteStore(state => state.updateNote);
  const closeNote = useNoteStore(state => state.closeNote);
  const updateNoteTitle = useNoteStore(state => state.updateNoteTitle);

  // Spawns new notes at slightly different coordinates so they don't stack
  const randomPosition = useMemo(() => ({
    top: `${Math.floor(Math.random() * 20) + 15}%`,
    left: `${Math.floor(Math.random() * 30) + 20}%`
  }), []);

  return createPortal(
    // Wrapper must be pointer-events-none so we can click things behind the notes
    <div 
      ref={constraintsRef} 
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
    >
      {/* --- DRAGGABLE & RESIZEABLE WINDOW --- */}
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false} 
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        // Using "absolute" prevents layout stretching conflicts with resize
        className={cn(
          "absolute pointer-events-auto flex flex-col",
          "bg-black/60 backdrop-blur-3xl shadow-2xl border border-white/10 rounded-2xl",
          "w-[350px] h-[400px] min-w-[200px] min-h-[200px] max-w-[95vw] max-h-[95vh]",
          "resize overflow-hidden" 
        )}
        style={{ top: randomPosition.top, left: randomPosition.left }}
      >
        {/* --- TITLE BAR (Drag Handle) --- */}
        <div 
          className="h-10 px-4 flex items-center justify-between border-b border-white/5 shrink-0 bg-black/40 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          {/* THE FIX: Clickable Input instead of static text */}
          <div 
            className="flex items-center gap-2 text-white/50"
            onPointerDown={e => e.stopPropagation()} 
          >
            <Edit3 size={14} className="pointer-events-none" />
            <input
              type="text"
              value={note.title || ''}
              onChange={(e) => updateNoteTitle(note.id, e.target.value)}
              placeholder="NOTE"
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-white/50 focus:text-white/90 placeholder:text-white/30 w-32"
              spellCheck={false}
            />
          </div>

          {/* Minimal Dark Gray X Button */}
          <button 
            onPointerDown={e => e.stopPropagation()} 
            onClick={() => closeNote(note.id)} 
            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* --- TEXT AREA --- */}
        <div className="flex-1 p-4" onPointerDown={e => e.stopPropagation()}>
          <textarea
            value={note.text}
            onChange={(e) => updateNote(note.id, e.target.value)}
            placeholder="Type your notes here..."
            className="w-full h-full bg-transparent text-white/90 placeholder:text-white/30 outline-none resize-none custom-scrollbar text-sm leading-relaxed"
            spellCheck={false}
          />
        </div>

      </motion.div>
    </div>,
    document.body
  );
}