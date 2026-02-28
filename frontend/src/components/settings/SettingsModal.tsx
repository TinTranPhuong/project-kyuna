import { useState, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Palette, Music, User as UserIcon, Trash2, 
  AlertTriangle, Save, Loader2, AlertCircle, Image as ImageIcon, X
} from 'lucide-react';
import type { AxiosError } from 'axios';

// Stores & Services
import { useSettingsStore, type ThemeType } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { cn } from '@/lib/utils';

type Tab = 'appearance' | 'music' | 'account';

const SETTINGS_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'account', label: 'Account', icon: UserIcon },
];

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  
  // Drag State
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  // --- Store Selectors ---
  const theme = useSettingsStore(state => state.theme);
  const setTheme = useSettingsStore(state => state.setTheme);
  const fontSize = useSettingsStore(state => state.fontSize);
  const setFontSize = useSettingsStore(state => state.setFontSize);
  
  const musicUrl = useSettingsStore(state => state.musicUrl);
  const setMusicUrl = useSettingsStore(state => state.setMusicUrl);

  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const logout = useAuthStore(state => state.logout);

  // --- Local Form State ---
  const [musicInput, setMusicInput] = useState(musicUrl ?? '');

  const [username, setUsername] = useState(user?.username ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // --- Handlers ---
  const handleApplyMusic = () => setMusicUrl(musicInput);

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
  };

  const clearCustomBackground = () => {
    localStorage.removeItem('kyuna-bg');
    window.dispatchEvent(new Event('bg-updated'));
  };

  const handleSaveUsername = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null); setSavingProfile(true);
    try {
      const updatedUser = await authService.updateProfile({ username });
      setUser(updatedUser);
      setProfileMsg({ type: 'ok', text: 'Username updated successfully.' });
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      setProfileMsg({ type: 'err', text: axiosErr.response?.data?.detail ?? 'Failed to update username.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) return setPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
    if (newPassword.length < 8) return setPasswordMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
    setSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'ok', text: 'Password updated successfully.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      setPasswordMsg({ type: 'err', text: axiosErr.response?.data?.detail ?? 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) return setDeleteError('Please enter your password to confirm.');
    setDeletingAccount(true);
    try {
      await authService.deleteAccount(deletePassword);
      await logout();
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>;
      setDeleteError(axiosErr.response?.data?.detail ?? 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  // --- Renderers ---
  const renderAppearance = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Environment Theme - Hidden for now using Tailwind 'hidden' class */}
      <div className="hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Environment Theme</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {(['night-garden', 'rainy-city', 'space', 'forest'] as ThemeType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); clearCustomBackground(); }}
              className={cn(
                "relative h-20 rounded-xl flex items-center justify-center capitalize text-sm font-medium transition-all overflow-hidden border",
                theme === t 
                  ? "border-primary-500 bg-primary-500/20 text-white shadow-[0_0_15px_rgba(var(--primary-500),0.3)]" 
                  : "border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/30"
              )}
            >
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom Wallpaper - Kept visible */}
      <section>
        <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
          <div>
            <h4 className="text-sm font-medium text-white">Custom Wallpaper</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Upload your own image to set your dashboard background.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCustomBackground} className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors">
              Reset
            </button>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-white text-xs font-medium cursor-pointer transition-colors shadow-lg">
              <ImageIcon size={14} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>
      </section>

      <section className="pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Typography</h3>
          <span className="text-xs text-primary-400 font-mono bg-primary-500/10 px-2 py-1 rounded">{fontSize}px</span>
        </div>
        <input 
          type="range" min="12" max="30" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full mb-6"
        />
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-white/80 leading-relaxed shadow-inner" style={{ fontSize: `${fontSize}px` }}>
          "The quick brown fox jumps over the lazy dog." This is a preview.
        </div>
      </section>
    </div>
  );

  const renderMusic = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section>
        <h3 className="text-lg font-semibold text-white mb-2">Custom Soundtrack</h3>
        <p className="text-sm text-white/50 mb-4">Paste a YouTube video or playlist URL.</p>
        <div className="flex gap-3">
          <input
            type="text" value={musicInput} onChange={e => setMusicInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500/50"
          />
          <button onClick={handleApplyMusic} className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
            Apply
          </button>
        </div>
      </section>

      <section className="pt-6 border-t border-white/5">
        <h3 className="text-lg font-semibold text-white mb-4">Curated Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'Lo-fi Hip Hop', url: 'https://youtube.com/watch?v=jfKfPfyJRdk' },
            { name: 'Chillhop',      url: 'https://youtube.com/watch?v=5yx6BWlEVcU' },
            { name: 'Smooth Jazz',   url: 'https://youtube.com/watch?v=neV3EPgvZ3g' },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => { setMusicInput(preset.url); setMusicUrl(preset.url); }}
              className="bg-black/30 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white/70 hover:text-white py-3 rounded-xl text-sm font-medium transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section>
        <h3 className="text-lg font-semibold text-white mb-3">Profile</h3>
        <form className="max-w-md space-y-3" onSubmit={handleSaveUsername}>
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} disabled={savingProfile} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500/50" />
          </div>
          {profileMsg && <p className={`text-xs ${profileMsg.type === 'ok' ? 'text-primary-400' : 'text-red-400'}`}>{profileMsg.text}</p>}
          <button type="submit" disabled={savingProfile} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </form>
      </section>

      <section className="pt-5 border-t border-white/5">
        <h3 className="text-lg font-semibold text-white mb-3">Security</h3>
        <form className="max-w-md space-y-3" onSubmit={handleChangePassword}>
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={savingPassword} placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500/50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={savingPassword} placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500/50" />
          </div>
          {passwordMsg && <p className={`text-xs ${passwordMsg.type === 'ok' ? 'text-primary-400' : 'text-red-400'}`}>{passwordMsg.text}</p>}
          <button type="submit" disabled={savingPassword} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
            {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Update Password
          </button>
        </form>
      </section>

      <section className="pt-5 border-t border-red-500/20">
        <button onClick={() => setIsDeleteModalOpen(true)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
          <Trash2 size={14} /> Delete Account
        </button>
      </section>
    </div>
  );

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      ref={constraintsRef} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden pointer-events-auto"
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false} 
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300, bounce: 0 }}
        className={cn(
          "relative flex flex-col md:flex-row bg-black/80 backdrop-blur-3xl shadow-2xl border border-white/10 rounded-2xl",
          "w-[800px] h-[50vh] min-w-[320px] md:min-w-[600px] min-h-[400px] max-w-[95vw] max-h-[95vh]",
          "resize overflow-hidden" 
        )}
      >
        <div className="w-full md:w-[220px] bg-black/50 md:border-r border-white/5 flex flex-col shrink-0 z-10 relative">
          <div 
            className="h-14 w-full cursor-grab active:cursor-grabbing shrink-0" 
            onPointerDown={(e) => dragControls.start(e)}
          />

          <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto pb-4" onPointerDown={e => e.stopPropagation()}>
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  activeTab === tab.id ? "bg-primary-600/90 text-white font-medium shadow-sm" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"
                )}
              >
                <div className={cn("p-1 rounded-md", activeTab === tab.id ? "bg-white/20" : "bg-white/10")}>
                  <tab.icon size={14} className={activeTab === tab.id ? "text-white" : "text-white/70"} />
                </div>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
          <div 
            className="h-14 px-4 flex items-center justify-between border-b border-white/5 shrink-0 bg-transparent cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <h2 className="text-sm font-bold text-white/80 select-none pointer-events-none pl-2">
              {SETTINGS_TABS.find(t => t.id === activeTab)?.label}
            </h2>

            <button 
              onPointerDown={e => e.stopPropagation()} 
              onClick={onClose} 
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              aria-label="Close Settings"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-6" onPointerDown={e => e.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="max-w-xl">
                {activeTab === 'appearance' && renderAppearance()}
                {activeTab === 'music' && renderMusic()}
                {activeTab === 'account' && renderAccount()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-surface-950 border border-white/10 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-5">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={24} />
                <h2 className="text-lg font-semibold">Delete Account?</h2>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-white/50">Enter password to confirm</label>
                <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} disabled={deletingAccount} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-red-500/50" />
              </div>
              {deleteError && <div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle size={14} />{deleteError}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setDeleteError(''); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl text-sm transition-colors" disabled={deletingAccount}>Cancel</button>
                <button onClick={handleDeleteAccount} disabled={deletingAccount} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                  {deletingAccount && <Loader2 size={14} className="animate-spin" />} Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
}