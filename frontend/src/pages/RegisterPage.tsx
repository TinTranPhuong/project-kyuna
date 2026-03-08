import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StickyNote, Languages, ArrowRight, Wrench, 
  ChevronLeft, Plus, Trash2, FileText 
} from 'lucide-react';
import { useNoteStore } from '@/store/noteStore';
import NotepadModal from '@/components/notes/NotepadModal'; 

export default function ToolsPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'hub' | 'notes'>('hub');
  const { notes, addNote, openNote, removeNote } = useNoteStore();

  const renderHub = () => {
    const tools = [
      {
        id: 'notes',
        name: 'Notes Gallery',
        description: 'Manage your quick thoughts, tasks, and code snippets in a visual grid.',
        icon: <StickyNote size={32} className="text-blue-400" />,
        action: () => setActiveView('notes'),
        gradient: 'from-blue-500/20 to-blue-900/10',
        hoverBorder: 'hover:border-blue-500/50',
      },
      {
        id: 'translate',
        name: 'Translate',
        description: 'AI-powered document and manga translation pipeline.',
        icon: <Languages size={32} className="text-purple-400" />,
        action: () => navigate('/translate'),
        gradient: 'from-purple-500/20 to-purple-900/10',
        hoverBorder: 'hover:border-purple-500/50',
      }
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
            <Wrench size={28} className="text-gray-200" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tools Hub</h1>
            <p className="text-gray-400 mt-1">Access your development and productivity utilities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={tool.action}
              className={`group relative flex flex-col p-6 cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br ${tool.gradient} backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${tool.hoverBorder} shadow-lg`}
            >
              <div className="mb-4 p-3 bg-black/40 inline-flex rounded-lg border border-white/5 w-fit">
                {tool.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-white transition-colors">
                {tool.name}
              </h3>
              <p className="text-gray-400 text-sm flex-grow mb-6">
                {tool.description}
              </p>
              
              <div className="flex items-center text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                Launch Tool 
                <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  // --- 2. NOTES GALLERY VIEW ---
  const renderNotesGallery = () => (
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
            onClick={() => setActiveView('hub')}
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
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2 text-white/70 group-hover:text-white transition-colors">
                <FileText size={16} className="text-blue-400/70" />
                <h3 className="font-semibold text-sm truncate max-w-[150px]">
                  {note.title && note.title !== 'NOTE' ? note.title : 'Untitled Note'}
                </h3>
              </div>
              
              {/* Delete Button (stops click from opening note) */}
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

            {/* Note Preview Body */}
            <div className="flex-1 overflow-hidden relative">
              <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">
                {note.text.trim() ? note.text : 'Empty Note...'}
              </p>
              {/* Fade out text at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#111116] to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="w-full h-full p-8 text-white overflow-hidden relative">
      <AnimatePresence mode="wait">
        {activeView === 'hub' ? (
          <React.Fragment key="hub">{renderHub()}</React.Fragment>
        ) : (
          <React.Fragment key="notes">{renderNotesGallery()}</React.Fragment>
        )}
      </AnimatePresence>

      {/* Render the floating draggable notes on top of this page if they are opened */}
      <AnimatePresence>
        {notes.filter(n => n.isOpen).map(note => (
          <NotepadModal key={note.id} note={note} />
        ))}
      </AnimatePresence>
    </div>
  );
}