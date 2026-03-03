import { useState, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Palette, Music, User as UserIcon, Trash2, 
  AlertTriangle, Save, Loader2, AlertCircle, Image as ImageIcon, X, Plus, Play, 
  ChevronDown, ChevronRight, Pencil, Check // <--- Added new icons for the UI
} from 'lucide-react';
import type { AxiosError } from 'axios';

// Stores & Services
import { useSettingsStore, type ThemeType, type MusicGroup, type MusicLink } from '@/store/settingsStore';
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
  const musicGroups = useSettingsStore(state => state.musicGroups);
  const setMusicGroups = useSettingsStore(state => state.setMusicGroups);

  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const logout = useAuthStore(state => state.logout);

  // --- Playlist Manager Local State ---
  const [newGroupName, setNewGroupName] = useState('');
  const [addingLinkTo, setAddingLinkTo] = useState<string | null>(null);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Dropdown (Accordion) State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Inline Editing State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // --- Account Local State ---
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

  // --- Handlers: Music Manager ---
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: MusicGroup = { id: Date.now().toString(), name: newGroupName.trim(), links: [] };
    setMusicGroups([...musicGroups, newGroup]);
    setExpandedGroups(prev => ({ ...prev, [newGroup.id]: true })); // Auto-expand new group
    setNewGroupName('');
  };

  const handleDeleteGroup = (id: string) => {
    setMusicGroups(musicGroups.filter(g => g.id !== id));
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePlayGroup = (group: MusicGroup) => {
    // Instantly plays the first song in the playlist
    if (group.links.length > 0) {
      setMusicUrl(group.links[0].url);
    }
  };

  // Group Editing
  const startEditingGroup = (group: MusicGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
  };
  const saveEditingGroup = (id: string) => {
    setMusicGroups(musicGroups.map(g => g.id === id ? { ...g, name: editGroupName.trim() || g.name } : g));
    setEditingGroupId(null);
  };

  // Link Operations
  const handleAddLink = (groupId: string) => {
    if (!newLinkUrl.trim()) return;
    const title = newLinkTitle.trim() || 'Unknown Track';
    const newGroups = musicGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, links: [...g.links, { id: Date.now().toString(), title, url: newLinkUrl.trim() }] };
      }
      return g;
    });
    setMusicGroups(newGroups);
    setNewLinkTitle(''); setNewLinkUrl(''); setAddingLinkTo(null);
  };

  const handleDeleteLink = (groupId: string, linkId: string) => {
    const newGroups = musicGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, links: g.links.filter(l => l.id !== linkId) };
      }
      return g;
    });
    setMusicGroups(newGroups);
  };

  // Link Editing
  const startEditingLink = (link: MusicLink) => {
    setEditingLinkId(link.id);
    setEditLinkTitle(link.title);
    setEditLinkUrl(link.url);
  };
  const saveEditingLink = (groupId: string, linkId: string) => {
    setMusicGroups(musicGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          links: g.links.map(l => l.id === linkId ? { ...l, title: editLinkTitle.trim() || l.title, url: editLinkUrl.trim() || l.url } : l)
        };
      }
      return g;
    }));
    setEditingLinkId(null);
  };

  // --- Handlers: Appearance & Account ---
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
    } finally { setSavingProfile(false); }
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
    } finally { setSavingPassword(false); }
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
      <div className="hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Environment Theme</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {(['night-garden', 'rainy-city', 'space', 'forest'] as ThemeType[]).map((t) => (
            <button
              key={t} onClick={() => { setTheme(t); clearCustomBackground(); }}
              className={cn("relative h-20 rounded-xl flex items-center justify-center capitalize text-sm font-medium transition-all overflow-hidden border", theme === t ? "border-primary-500 bg-primary-500/20 text-white shadow-[0_0_15px_rgba(var(--primary-500),0.3)]" : "border-white/10 bg-black/40 text-white/50 hover:text-white hover:border-white/30")}
            >{t.replace('-', ' ')}</button>
          ))}
        </div>
      </div>
      <section>
        <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
          <div>
            <h4 className="text-sm font-medium text-white">Custom Wallpaper</h4>
            <p className="text-[11px] text-white/50 mt-0.5">Upload your own image to set your dashboard background.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCustomBackground} className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors">Reset</button>
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
        <input type="range" min="12" max="30" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full mb-6" />
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-white/80 leading-relaxed shadow-inner" style={{ fontSize: `${fontSize}px` }}>"The quick brown fox jumps over the lazy dog." This is a preview.</div>
      </section>
    </div>
  );

  const renderMusic = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Create Group Form */}
      <div className="flex gap-3">
        <input
          type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
          placeholder="New Playlist Name..."
          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary-500/50"
        />
        <button onClick={handleAddGroup} disabled={!newGroupName.trim()} className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
          <Plus size={16} /> Create
        </button>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {musicGroups.map(group => {
          const isExpanded = expandedGroups[group.id];
          
          return (
            <div key={group.id} className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
              
              {/* --- GROUP HEADER --- */}
              <div 
                className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors select-none"
                onClick={() => toggleGroupExpand(group.id)}
              >
                <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
                  <div className="text-white/40">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  
                  {editingGroupId === group.id ? (
                    <div className="flex items-center gap-2 w-full max-w-[200px]" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" autoFocus value={editGroupName} onChange={e => setEditGroupName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEditingGroup(group.id)}
                        className="w-full bg-black/50 border border-white/20 rounded-md px-2 py-1 text-sm text-white outline-none"
                      />
                      <button onClick={() => saveEditingGroup(group.id)} className="text-primary-400 hover:text-primary-300 p-1"><Check size={16}/></button>
                      <button onClick={() => setEditingGroupId(null)} className="text-white/40 hover:text-white p-1"><X size={16}/></button>
                    </div>
                  ) : (
                    <h4 className="text-white font-semibold flex items-center gap-2 truncate">
                      <Music size={14} className="text-primary-400 shrink-0" /> {group.name}
                      <span className="text-xs font-normal text-white/30 ml-2 shrink-0">({group.links.length})</span>
                    </h4>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handlePlayGroup(group)} className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-md transition-all active:scale-95" title="Play Playlist">
                    <Play size={12} fill="currentColor" className="ml-0.5" />
                  </button>
                  
                  <button onClick={() => startEditingGroup(group)} className="p-1.5 text-white/40 hover:text-white transition-colors" title="Edit Playlist Name">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 text-white/40 hover:text-red-400 transition-colors" title="Delete Playlist">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* --- GROUP DROPDOWN CONTENT --- */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 space-y-2">
                      {group.links.length === 0 ? (
                        <p className="text-xs text-white/30 italic text-center py-2">No links in this group yet.</p>
                      ) : (
                        group.links.map(link => {
                          const isActive = musicUrl === link.url;
                          return (
                            <div key={link.id} className={cn("flex flex-col gap-2 p-2.5 rounded-xl transition-colors group/link", isActive ? "bg-primary-500/10 border border-primary-500/20" : "hover:bg-white/5 border border-transparent")}>
                              
                              {/* If Editing Link */}
                              {editingLinkId === link.id ? (
                                <div className="space-y-2">
                                  <input type="text" placeholder="Title" value={editLinkTitle} onChange={e => setEditLinkTitle(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-md px-2 py-1 text-xs text-white outline-none" />
                                  <input type="text" placeholder="URL" value={editLinkUrl} onChange={e => setEditLinkUrl(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded-md px-2 py-1 text-xs text-white outline-none" />
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditingLinkId(null)} className="text-xs text-white/50 hover:text-white">Cancel</button>
                                    <button onClick={() => saveEditingLink(group.id, link.id)} className="text-xs text-primary-400 font-bold hover:text-primary-300">Save</button>
                                  </div>
                                </div>
                              ) : (
                                /* Normal Link View */
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col min-w-0 flex-1 pl-1 cursor-pointer" onClick={() => setMusicUrl(link.url)}>
                                    <span className={cn("text-sm truncate transition-colors", isActive ? "text-primary-400 font-medium" : "text-white/90 group-hover/link:text-white")}>{link.title}</span>
                                    <span className="text-[10px] text-white/30 truncate mt-0.5">{link.url}</span>
                                  </div>
                                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover/link:opacity-100 transition-opacity">
                                    <button onClick={() => setMusicUrl(link.url)} className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-md transition-all active:scale-95" title="Play Song">
                                      <Play size={12} fill="currentColor" className="ml-0.5" />
                                    </button>
                                    <button onClick={() => startEditingLink(link)} className="p-2 text-white/40 hover:text-white rounded-lg transition-colors" title="Edit Song">
                                      <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteLink(group.id, link.id)} className="p-2 text-white/40 hover:text-red-400 rounded-lg transition-colors" title="Remove Song">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Add Link Form */}
                      {addingLinkTo === group.id ? (
                        <div className="mt-4 p-3 bg-black/40 border border-white/10 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                          <input type="text" placeholder="Song/Playlist Title (e.g. Lofi Girl)" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary-500/50" />
                          <input type="text" placeholder="YouTube URL" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLink(group.id)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary-500/50" />
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleAddLink(group.id)} disabled={!newLinkUrl.trim()} className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white py-1.5 rounded-lg text-xs font-medium transition-colors">Add</button>
                            <button onClick={() => { setAddingLinkTo(null); setNewLinkTitle(''); setNewLinkUrl(''); }} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-lg text-xs transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingLinkTo(group.id)} className="w-full mt-2 py-2 border border-dashed border-white/10 hover:border-white/30 text-white/40 hover:text-white/80 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                          <Plus size={14} /> Add Link
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
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
        drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0} dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300, bounce: 0 }}
        className={cn(
          "relative flex flex-col md:flex-row bg-black/80 backdrop-blur-3xl shadow-2xl border border-white/10 rounded-2xl",
          "w-[800px] h-[50vh] min-w-[320px] md:min-w-[600px] min-h-[400px] max-w-[95vw] max-h-[95vh]",
          "resize overflow-hidden" 
        )}
      >
        <div className="w-full md:w-[220px] bg-black/50 md:border-r border-white/5 flex flex-col shrink-0 z-10 relative">
          <div className="h-14 w-full cursor-grab active:cursor-grabbing shrink-0" onPointerDown={(e) => dragControls.start(e)} />
          <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto pb-4" onPointerDown={e => e.stopPropagation()}>
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200", activeTab === tab.id ? "bg-primary-600/90 text-white font-medium shadow-sm" : "text-white/70 hover:bg-white/5 hover:text-white font-medium")}
              >
                <div className={cn("p-1 rounded-md", activeTab === tab.id ? "bg-white/20" : "bg-white/10")}><tab.icon size={14} className={activeTab === tab.id ? "text-white" : "text-white/70"} /></div>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 shrink-0 bg-transparent cursor-grab active:cursor-grabbing" onPointerDown={(e) => dragControls.start(e)}>
            <h2 className="text-sm font-bold text-white/80 select-none pointer-events-none pl-2">{SETTINGS_TABS.find(t => t.id === activeTab)?.label}</h2>
            <button onPointerDown={e => e.stopPropagation()} onClick={onClose} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors" aria-label="Close Settings"><X size={18} strokeWidth={2} /></button>
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-black/90 border border-white/10 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-5">
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