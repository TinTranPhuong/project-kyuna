import { motion } from 'framer-motion';
import { X, Edit3, Trash2, FileText } from 'lucide-react';
import { useNoteStore } from '@/store/noteStore';

export default function NotesManagerModal() {
  const { notes, setManagerOpen, addNote, openNote, removeNote } = useNoteStore();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="pointer-events-auto w-full max-w-sm bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header - Made slightly darker for contrast */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40">
          <h2 className="text-sm font-bold text-white/90 tracking-wide">Saved Notes</h2>
          <button onClick={() => setManagerOpen(false)} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* New Note Button */}
          <button 
            onClick={() => { addNote(); setManagerOpen(false); }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all group shadow-sm"
          >
            <Edit3 size={18} className="text-primary-400" />
            <span className="font-medium text-sm">New Notepad</span>
          </button>

          {/* List of Saved Notes */}
          {notes.map(note => (
            <div key={note.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
              
              <button 
                onClick={() => { openNote(note.id); setManagerOpen(false); }}
                className="flex items-center gap-3 flex-1 text-left overflow-hidden group"
              >
                <div className="p-2 rounded-xl bg-white/5 text-white/40 group-hover:text-white/70 transition-colors shrink-0">
                    <FileText size={16} />
                </div>
                <span className="text-sm font-medium text-white/70 group-hover:text-white truncate">
                  {note.title && note.title !== 'NOTE' 
                    ? note.title 
                    : (note.text.trim() ? note.text.slice(0, 30) : 'Empty Note...')}
                </span>
              </button>
              
              <button 
                onClick={() => removeNote(note.id)}
                className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors ml-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Empty State Polish */}
          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-white/30">
              <FileText size={32} className="mb-3 opacity-20" />
              <p className="text-xs font-medium tracking-wide">No saved notes yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}