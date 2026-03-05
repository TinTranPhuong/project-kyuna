import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, ChevronLeft, Plus, Trash2, FileText } from 'lucide-react';
import { useNoteStore } from '@/store/noteStore';
import NotepadModal from '@/components/notes/NotepadModal'; 

export default function NotesPage() {
  const navigate = useNavigate();
  const { notes, addNote, openNote, removeNote } = useNoteStore();

  return (
    <div className="w-full h-full p-8 text-white overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-7xl mx-auto h-full flex flex-col"
      >
        {/* Gallery Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/tools')}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <StickyNote className="text-blue-400" />
                Notes Gallery
              </h1>
              <p className="text-gray-400 mt-1 text-sm">Your floating workspace, visualized.</p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20 custom-scrollbar pr-2">
          
          {/* Create New Note Card */}
          <button 
            onClick={() => addNote()}
            className="flex flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 text-white/50 hover:text-blue-400 transition-all group shadow-sm"
          >
            <div className="p-3 bg-black/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="font-medium text-sm">Create New Note</span>
          </button>

          {/* Saved Notes Cards */}
          {notes.map(note => (
            <div 
              key={note.id} 
              className="group relative flex flex-col h-[200px] p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/30 hover:-translate-y-1 transition-all shadow-lg overflow-hidden cursor-pointer"
              onClick={() => openNote(note.id)}
            >
              <div className="flex items-start justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2 text-white/70 group-hover:text-white transition-colors">
                  <FileText size={16} className="text-blue-400/70" />
                  <h3 className="font-semibold text-sm truncate max-w-[150px]">
                    {note.title && note.title !== 'NOTE' ? note.title : 'Untitled Note'}
                  </h3>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNote(note.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">
                  {note.text.trim() ? note.text : 'Empty Note...'}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#111116] to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Render the floating draggable notes */}
      <AnimatePresence>
        {notes.filter(n => n.isOpen).map(note => (
          <NotepadModal key={note.id} note={note} />
        ))}
      </AnimatePresence>
    </div>
  );
}