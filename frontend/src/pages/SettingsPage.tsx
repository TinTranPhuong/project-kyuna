import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Timer, Music, Cpu, User as UserIcon, 
  Trash2, Check, AlertTriangle, Save 
} from 'lucide-react';

// Stores
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useTimerStore } from '@/store/timerStore';

type Tab = 'appearance' | 'timer' | 'music' | 'ai' | 'account';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  
  // -- Store Bindings --
  const settings = useSettingsStore();
  const updateTimerStore = useTimerStore((state) => state.updateConfig);
  const { user, logout } = useAuthStore();

  // -- Local States for Forms & Modals --
  const [musicInput, setMusicInput] = useState(settings.musicUrl || '');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // AI Models Mock State (To be replaced with actual /api/v1/chat/models fetch)
  const [availableModels, setAvailableModels] = useState({
    chat: [] as { id: string; name: string }[],
    vision: [] as { id: string; name: string }[]
  });

  useEffect(() => {
    // Fetch models on mount. 
    // Using GGUF models optimized for ~16GB VRAM setups as placeholders
    setAvailableModels({
      chat: [
        { id: 'qwen-2.5-14b-gguf', name: 'Qwen 2.5 (14B GGUF)' },
        { id: 'gpt-oss-20b-q4', name: 'GPT-OSS 20B (Q4)' }
      ],
      vision: [
        { id: 'llava-1.5-13b', name: 'LLaVA 1.5 13B' }
      ]
    });
  }, []);

  // -- Handlers --
  const handleTimerChange = (field: string, value: number) => {
    settings.setTimerConfig(field, value);
    // Sync with timer store immediately per acceptance criteria
    updateTimerStore({ [field]: value }); 
  };

  const handleApplyMusic = () => {
    settings.setMusicUrl(musicInput);
  };

  const handleDeleteAccount = async () => {
    try {
      // await authService.deleteAccount();
      logout();
    } catch (error) {
      console.error('Failed to delete account', error);
    }
  };

  // -- Render Helpers --
  const renderAppearance = () => (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Environment Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['night-garden', 'rainy-city', 'space', 'forest'].map((theme) => (
            <button
              key={theme}
              onClick={() => settings.setTheme(theme)}
              className={`relative h-24 rounded-xl overflow-hidden border-2 transition-all ${
                settings.theme === theme ? 'border-primary-500 scale-105' : 'border-transparent hover:border-white/20'
              }`}
            >
              {/* Fallback colors if actual image backgrounds are missing */}
              <div className="absolute inset-0 bg-surface-800 flex items-center justify-center text-sm capitalize text-white/70">
                {theme.replace('-', ' ')}
              </div>
              {settings.theme === theme && (
                <div className="absolute top-2 right-2 bg-primary-500 rounded-full p-1">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Typography</h3>
        <div className="space-y-4">
          <label className="text-sm text-white/70 flex justify-between">
            <span>Base Font Size</span>
            <span className="text-primary-400">{settings.fontSize}px</span>
          </label>
          <input 
            type="range" 
            min="12" 
            max="18" 
            step="1"
            value={settings.fontSize}
            onChange={(e) => settings.setFontSize(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div 
            className="p-4 bg-white/5 rounded-lg text-white/90" 
            style={{ fontSize: `${settings.fontSize}px` }}
          >
            "The quick brown fox jumps over the lazy dog." This is a live preview of your reading experience in Project Luna.
          </div>
        </div>
      </section>
    </div>
  );

  const renderTimer = () => (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Durations (Minutes)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-white/70">Focus Session</label>
            <input 
              type="number" min="1" max="60" 
              value={settings.workDuration}
              onChange={(e) => handleTimerChange('workDuration', Number(e.target.value))}
              className="glass-input text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Short Break</label>
            <input 
              type="number" min="1" max="30" 
              value={settings.shortBreak}
              onChange={(e) => handleTimerChange('shortBreak', Number(e.target.value))}
              className="glass-input text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Long Break</label>
            <input 
              type="number" min="1" max="60" 
              value={settings.longBreak}
              onChange={(e) => handleTimerChange('longBreak', Number(e.target.value))}
              className="glass-input text-lg"
            />
          </div>
        </div>
      </section>

      <section className="pt-6 border-t border-white/10 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
        <label className="flex items-center justify-between p-4 glass-card cursor-pointer hover:bg-white/10 transition-colors">
          <div>
            <div className="font-medium text-white">Auto-start Breaks</div>
            <div className="text-sm text-white/50">Automatically begin break timers when focus ends</div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.autoStartBreaks}
            onChange={(e) => settings.setToggle('autoStartBreaks', e.target.checked)}
            className="w-5 h-5 accent-primary-500 rounded cursor-pointer"
          />
        </label>
        
        <label className="flex items-center justify-between p-4 glass-card cursor-pointer hover:bg-white/10 transition-colors">
          <div>
            <div className="font-medium text-white">Notification Sounds</div>
            <div className="text-sm text-white/50">Play a chime when a session finishes</div>
          </div>
          <input 
            type="checkbox" 
            checked={settings.soundEnabled}
            onChange={(e) => settings.setToggle('soundEnabled', e.target.checked)}
            className="w-5 h-5 accent-primary-500 rounded cursor-pointer"
          />
        </label>
      </section>
    </div>
  );

  const renderMusic = () => (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Custom Soundtrack</h3>
        <p className="text-sm text-white/50 mb-2">Paste a YouTube video or playlist URL.</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={musicInput}
            onChange={(e) => setMusicInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="glass-input flex-1"
          />
          <button onClick={handleApplyMusic} className="btn-primary">
            Apply
          </button>
        </div>
      </section>

      <section className="pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Curated Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Lo-fi Hip Hop', url: 'https://youtube.com/watch?v=jfKfPfyJRdk' },
            { name: 'Chillhop', url: 'https://youtube.com/watch?v=5yx6BWlEVcU' },
            { name: 'Smooth Jazz', url: 'https://youtube.com/watch?v=neV3EPgvZ3g' }
          ].map((preset) => (
            <button 
              key={preset.name}
              onClick={() => {
                setMusicInput(preset.url);
                settings.setMusicUrl(preset.url);
              }}
              className="glass-btn text-center py-4"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderAI = () => (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Text Engine</h3>
          <p className="text-sm text-white/50 mb-4">Select the primary model used for standard chat and reasoning.</p>
          <select 
            value={settings.activeChatModel}
            onChange={(e) => settings.setModel('chat', e.target.value)}
            className="glass-input w-full md:w-1/2 cursor-pointer"
          >
            <option value="" disabled>Select a chat model...</option>
            {availableModels.chat.map(m => (
              <option key={m.id} value={m.id} className="bg-surface-800">{m.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white mb-2">Vision Engine</h3>
          <p className="text-sm text-white/50 mb-4">Select the model used for the Translator and image analysis.</p>
          <select 
            value={settings.activeVisionModel}
            onChange={(e) => settings.setModel('vision', e.target.value)}
            className="glass-input w-full md:w-1/2 cursor-pointer"
          >
            <option value="" disabled>Select a vision model...</option>
            {availableModels.vision.map(m => (
              <option key={m.id} value={m.id} className="bg-surface-800">{m.name}</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );

  const renderAccount = () => (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
        <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label className="text-sm text-white/70">Username</label>
            <input type="text" defaultValue={user?.username} className="glass-input" />
          </div>
          <button type="submit" className="glass-btn flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Username
          </button>
        </form>
      </section>

      <section className="pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
        <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label className="text-sm text-white/70">Current Password</label>
            <input type="password" placeholder="••••••••" className="glass-input" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/70">New Password</label>
            <input type="password" placeholder="••••••••" className="glass-input" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/70">Confirm New Password</label>
            <input type="password" placeholder="••••••••" className="glass-input" />
          </div>
          <button type="submit" className="glass-btn flex items-center gap-2">
            <Save className="w-4 h-4" /> Update Password
          </button>
        </form>
      </section>

      <section className="pt-8 mt-8 border-t border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-white/50 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card relative z-10 w-full max-w-sm p-6 space-y-6"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Delete Account?</h2>
              </div>
              <p className="text-white/80 text-sm">
                This action is permanent and will wipe all your conversations and settings. Are you absolutely sure?
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsDeleteModalOpen(false)} className="glass-btn flex-1">Cancel</button>
                <button onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 flex-1 transition-colors">
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // -- Main Layout --
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-surface-900 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-white/5 backdrop-blur-md shrink-0 flex flex-row md:flex-col p-4 gap-2 overflow-x-auto md:overflow-y-auto">
        <h2 className="hidden md:block text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 px-2">Settings</h2>
        {[
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'timer', label: 'Timer & Focus', icon: Timer },
          { id: 'music', label: 'Music Player', icon: Music },
          { id: 'ai', label: 'AI Models', icon: Cpu },
          { id: 'account', label: 'Account', icon: UserIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-5 h-5 shrink-0" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'appearance' && renderAppearance()}
          {activeTab === 'timer' && renderTimer()}
          {activeTab === 'music' && renderMusic()}
          {activeTab === 'ai' && renderAI()}
          {activeTab === 'account' && renderAccount()}
        </div>
      </main>

    </div>
  );
}