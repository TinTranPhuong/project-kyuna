import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Settings, User, LogOut, FilePlus, Calculator, MonitorPlay } from 'lucide-react';
import NotepadModal from '@/components/notes/NotepadModal';
import SettingsModal from '@/components/settings/SettingsModal';
import { useNoteStore } from '@/store/noteStore';
import { useAuthStore } from '@/store/authStore';
import NotesManagerModal from '@/components/notes/NotesManagerModal';
import CalculatorModal from '@/components/calculator/CalculatorModal';
import { useWidgetStore } from '@/store/widgetStore';
import MiniYoutube from '@/components/ui/MiniYoutube';

// --- Digital Clock Component ---
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center drop-shadow-2xl text-white select-none font-['Caveat_Brush']">
      <h1 className="text-[6rem] md:text-[10rem] font-normal leading-none tracking-wider">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
      </h1>
      <p className="text-lg md:text-2xl font-medium tracking-widest uppercase opacity-80 mt-4 md:mt-6">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
};

export default function HomePage() {
  const notes = useNoteStore(state => state.notes);
  const isManagerOpen = useNoteStore(state => state.isManagerOpen);
  const addNote = useNoteStore(state => state.addNote); // <-- Brought in addNote
  
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [showDropdown, setShowDropdown] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const isYoutubeOpen = useWidgetStore(state => state.isYoutubeOpen);
  const setYoutubeOpen = useWidgetStore(state => state.setYoutubeOpen);

  // Close dropdown if user clicks anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem('kyuna-bg', reader.result as string);
        window.dispatchEvent(new Event('bg-updated'));
      };
      reader.readAsDataURL(file);
    }
    setShowDropdown(false); 
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-8 overflow-hidden">
      
      {/* Top Right Controls Container - Now a flex row to hold multiple buttons! */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        
        {/* Calculator Button */}
        <button 
          onClick={() => setIsCalculatorOpen(true)}
          className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 text-white/60 hover:text-primary-400 rounded-full transition-all active:scale-95 shadow-xl backdrop-blur-md"
          title="Open Calculator"
        >
          <Calculator size={18} />
        </button>

        {/* Youtube Button */}
        <button
          onClick={() => setYoutubeOpen(true)}
          className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 rounded-full backdrop-blur-md cursor-pointer transition-all text-white/80 hover:text-red-400 shadow-xl"
          title="Mini YouTube Player"
        >
          <MonitorPlay size={18} />
        </button>

        {/* Quick Note Button */}
        <button 
          onClick={() => addNote()}
          className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 text-white/60 hover:text-primary-400 rounded-full transition-all active:scale-95 shadow-xl backdrop-blur-md"
          title="Create New Note"
        >
          <FilePlus size={18} />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 rounded-full backdrop-blur-md cursor-pointer transition-all text-white/80 hover:text-white shadow-xl"
          >
            {user?.username ? (
              <span className="font-bold text-sm uppercase">{user.username.charAt(0)}</span>
            ) : (
              <User size={18} />
            )}
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-3 w-56 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1"
              >
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Account</p>
                  <p className="text-sm text-white font-medium truncate">{user?.username || 'Guest'}</p>
                </div>

                <label className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors cursor-pointer group">
                  <ImageIcon size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  Change Wallpaper
                  <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleImageUpload} />
                </label>

                <button 
                  onClick={() => { setIsSettingsOpen(true); setShowDropdown(false); }} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors group text-left"
                >
                  <Settings size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  Settings
                </button>

                <div className="h-px bg-white/10 my-1 mx-2" />

                <button 
                  onClick={logout} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400/80 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors group text-left"
                >
                  <LogOut size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center Clock */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
        <DigitalClock />
      </div>

      {/* Render floating Notepads (Only if they are set to open) */}
      <AnimatePresence>
        {notes.filter(n => n.isOpen).map(note => (
          <NotepadModal key={note.id} note={note} />
        ))}
      </AnimatePresence>

      {/* Notes Manager Modal */}
      <AnimatePresence>
        {isManagerOpen && <NotesManagerModal />}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      </AnimatePresence>

      {/* Calculator Modal */}
      <AnimatePresence>
        {isCalculatorOpen && <CalculatorModal onClose={() => setIsCalculatorOpen(false)} />}
      </AnimatePresence>

      {/* Floating Mini YouTube Player */}
        <AnimatePresence>
          {isYoutubeOpen && <MiniYoutube onClose={() => setYoutubeOpen(false)} />}
        </AnimatePresence>
    </div>
  );
}