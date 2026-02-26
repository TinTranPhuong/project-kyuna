import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Timer, Music, Cpu, User as UserIcon,
  Trash2, Check, AlertTriangle, Save, Loader2, AlertCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'

// Stores
// BUG 1 FIXED: const settings = useSettingsStore() without a selector subscribes to
// the ENTIRE store — every single state change (even unrelated ones like musicUrl
// updating on keystroke) re-renders the whole SettingsPage. Use individual selectors.
import { useSettingsStore } from '@/store/settingsStore'
// BUG 2 FIXED: removed useTimerStore — timerStore.updateConfig does not exist.
// Timer duration settings live in settingsStore and timerStore reads them via
// useSettingsStore.getState() on each tick/reset. No separate sync step needed.
import { useAuthStore } from '@/store/authStore'

// Services
import { authService } from '@/services/auth.service'
// BUG 10 FIXED: AI models are fetched from the real API, not a hardcoded mock array.
import { chatService } from '@/services/chat.service'

// BUG 11 FIXED: import ThemeType so the setTheme() call is type-safe.
// Without the cast, TypeScript infers theme as string, but setTheme expects ThemeType.
import type { ThemeType } from '@/store/settingsStore'

type Tab = 'appearance' | 'timer' | 'music' | 'ai' | 'account'

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('appearance')

  // BUG 1 FIXED: individual selectors instead of subscribing to the whole store
  const theme              = useSettingsStore(state => state.theme)
  const fontSize           = useSettingsStore(state => state.fontSize)
  const musicUrl           = useSettingsStore(state => state.musicUrl)
  const pomodoroWork       = useSettingsStore(state => state.pomodoroWork)
  const pomodoroShortBreak = useSettingsStore(state => state.pomodoroShortBreak)
  const pomodoroLongBreak  = useSettingsStore(state => state.pomodoroLongBreak)
  const autoStartBreaks    = useSettingsStore(state => state.autoStartBreaks)
  const notificationSound  = useSettingsStore(state => state.notificationSound)  // BUG 5: was soundEnabled
  const chatModel          = useSettingsStore(state => state.chatModel)           // BUG 6: was activeChatModel
  const visionModel        = useSettingsStore(state => state.visionModel)         // BUG 7: was activeVisionModel

  const setTheme            = useSettingsStore(state => state.setTheme)
  const setFontSize         = useSettingsStore(state => state.setFontSize)
  const setMusicUrl         = useSettingsStore(state => state.setMusicUrl)
  // BUG 3 FIXED: settings.setTimerConfig does not exist. The correct individual setters are:
  const setPomodoroWork       = useSettingsStore(state => state.setPomodoroWork)
  const setPomodoroShortBreak = useSettingsStore(state => state.setPomodoroShortBreak)
  const setPomodoroLongBreak  = useSettingsStore(state => state.setPomodoroLongBreak)
  const setToggle             = useSettingsStore(state => state.setToggle)
  // BUG 8 FIXED: settings.setModel('chat', ...) does not exist.
  // The correct actions are setChatModel and setVisionModel.
  const setChatModel    = useSettingsStore(state => state.setChatModel)
  const setVisionModel  = useSettingsStore(state => state.setVisionModel)

  const user   = useAuthStore(state => state.user)
  const setUser = useAuthStore(state => state.setUser)
  const logout  = useAuthStore(state => state.logout)

  // ── Local form state ─────────────────────────────────────────────────────

  const [musicInput, setMusicInput] = useState(musicUrl ?? '')

  // Account — Profile form
  const [username, setUsername]     = useState(user?.username ?? '')
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Account — Password form
  const [currentPassword,  setCurrentPassword]  = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [passwordMsg,      setPasswordMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingPassword,   setSavingPassword]   = useState(false)

  // Account — Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  // BUG 9 FIXED: deleteAccount requires a password for server-side verification.
  // The original modal had no password field — the API call was also commented out.
  const [deletePassword,   setDeletePassword]   = useState('')
  const [deletingAccount,  setDeletingAccount]  = useState(false)
  const [deleteError,      setDeleteError]      = useState('')

  // ── AI Models — real API fetch ────────────────────────────────────────────

  // BUG 10 FIXED: models were fetched via a hardcoded mock array (setAvailableModels
  // called inside useEffect with static data). This means the dropdowns always show
  // the same two models regardless of what is actually loaded on the server.
  const { data: allModels = [] } = useQuery({
    queryKey: ['chat-models'],
    queryFn:  chatService.getModels,
  })

  const chatModels   = allModels.filter(m => m.type === 'text')
  const visionModels = allModels.filter(m => m.type === 'vision')

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApplyMusic = () => setMusicUrl(musicInput)

  // BUG 12 FIXED: handleSaveUsername was missing entirely — the form had no onSubmit
  // handler that actually called the API. The button only prevented default.
  const handleSaveUsername = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const updatedUser = await authService.updateProfile({ username })
      setUser(updatedUser)
      setProfileMsg({ type: 'ok', text: 'Username updated successfully.' })
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>
      setProfileMsg({
        type: 'err',
        text: axiosErr.response?.data?.detail ?? 'Failed to update username.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  // BUG 13 FIXED: handleChangePassword was missing entirely.
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    setSavingPassword(true)
    try {
      // authService.changePassword(currentPassword, newPassword) — two positional args
      await authService.changePassword(currentPassword, newPassword)
      setPasswordMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>
      setPasswordMsg({
        type: 'err',
        text: axiosErr.response?.data?.detail ?? 'Failed to update password.',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  // BUG 9 FIXED: deleteAccount now collects and sends a password.
  // Also uncommented the actual API call (was commented out in the original).
  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.')
      return
    }
    setDeletingAccount(true)
    try {
      await authService.deleteAccount(deletePassword)
      await logout()
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>
      setDeleteError(
        axiosErr.response?.data?.detail ?? 'Failed to delete account. Check your password.'
      )
      setDeletingAccount(false)
    }
  }

  // ── Tab Renderers ─────────────────────────────────────────────────────────

  const renderAppearance = () => (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Environment Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['night-garden', 'rainy-city', 'space', 'forest'] as ThemeType[]).map(t => (
            <button
              key={t}
              // BUG 11 FIXED: t is now ThemeType (narrowed from the typed array), so
              // setTheme(t) is fully type-safe — no cast or TypeScript error.
              onClick={() => setTheme(t)}
              className={`relative h-24 rounded-xl overflow-hidden border-2 transition-all ${
                theme === t
                  ? 'border-primary-500 scale-105'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              <div className="absolute inset-0 bg-surface-800 flex items-center justify-center text-sm capitalize text-white/70">
                {t.replace('-', ' ')}
              </div>
              {theme === t && (
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
            <span className="text-primary-400">{fontSize}px</span>
          </label>
          <input
            type="range" min="12" max="18" step="1"
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div
            className="p-4 bg-white/5 rounded-lg text-white/90"
            style={{ fontSize: `${fontSize}px` }}
          >
            "The quick brown fox jumps over the lazy dog." This is a live preview of your reading experience in MyAI Space.
          </div>
        </div>
      </section>
    </div>
  )

  const renderTimer = () => (
    <div className="space-y-8 animate-fade-in">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Durations (Minutes)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-white/70">Focus Session</label>
            {/* BUG 4 FIXED: settings.workDuration → pomodoroWork */}
            {/* BUG 3 FIXED: settings.setTimerConfig → setPomodoroWork */}
            <input
              type="number" min="1" max="60"
              value={pomodoroWork}
              onChange={e => setPomodoroWork(Number(e.target.value))}
              className="glass-input text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Short Break</label>
            {/* BUG 4 FIXED: settings.shortBreak → pomodoroShortBreak */}
            <input
              type="number" min="1" max="30"
              value={pomodoroShortBreak}
              onChange={e => setPomodoroShortBreak(Number(e.target.value))}
              className="glass-input text-lg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Long Break</label>
            {/* BUG 4 FIXED: settings.longBreak → pomodoroLongBreak */}
            <input
              type="number" min="1" max="60"
              value={pomodoroLongBreak}
              onChange={e => setPomodoroLongBreak(Number(e.target.value))}
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
            checked={autoStartBreaks}
            onChange={e => setToggle('autoStartBreaks', e.target.checked)}
            className="w-5 h-5 accent-primary-500 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-4 glass-card cursor-pointer hover:bg-white/10 transition-colors">
          <div>
            <div className="font-medium text-white">Notification Sounds</div>
            <div className="text-sm text-white/50">Play a chime when a session finishes</div>
          </div>
          {/* BUG 5 FIXED: settings.soundEnabled → notificationSound */}
          <input
            type="checkbox"
            checked={notificationSound}
            onChange={e => setToggle('notificationSound', e.target.checked)}
            className="w-5 h-5 accent-primary-500 rounded cursor-pointer"
          />
        </label>
      </section>
    </div>
  )

  const renderMusic = () => (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Custom Soundtrack</h3>
        <p className="text-sm text-white/50">Paste a YouTube video or playlist URL.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={musicInput}
            onChange={e => setMusicInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="glass-input flex-1"
          />
          <button onClick={handleApplyMusic} className="btn-primary">Apply</button>
        </div>
      </section>

      <section className="pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Curated Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Lo-fi Hip Hop', url: 'https://youtube.com/watch?v=jfKfPfyJRdk' },
            { name: 'Chillhop',      url: 'https://youtube.com/watch?v=5yx6BWlEVcU' },
            { name: 'Smooth Jazz',   url: 'https://youtube.com/watch?v=neV3EPgvZ3g' },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => { setMusicInput(preset.url); setMusicUrl(preset.url) }}
              className="glass-btn text-center py-4"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  )

  const renderAI = () => (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Text Engine</h3>
          <p className="text-sm text-white/50 mb-4">Select the primary model used for standard chat and reasoning.</p>
          {/* BUG 6+8 FIXED: settings.activeChatModel → chatModel; settings.setModel('chat',...) → setChatModel */}
          {/* BUG 10 FIXED: chatModels now comes from the real API (useQuery), not a hardcoded array */}
          <select
            value={chatModel ?? ''}
            onChange={e => setChatModel(e.target.value)}
            className="glass-input w-full md:w-1/2 cursor-pointer"
          >
            <option value="" disabled>Select a chat model…</option>
            {chatModels.map(m => (
              <option key={m.id} value={m.id} className="bg-surface-800">{m.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-6 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white mb-2">Vision Engine</h3>
          <p className="text-sm text-white/50 mb-4">Select the model used for the Translator and image analysis.</p>
          {/* BUG 7+8 FIXED: settings.activeVisionModel → visionModel; settings.setModel('vision',...) → setVisionModel */}
          <select
            value={visionModel ?? ''}
            onChange={e => setVisionModel(e.target.value)}
            className="glass-input w-full md:w-1/2 cursor-pointer"
          >
            <option value="" disabled>Select a vision model…</option>
            {visionModels.map(m => (
              <option key={m.id} value={m.id} className="bg-surface-800">{m.name}</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  )

  const renderAccount = () => (
    <div className="space-y-8 animate-fade-in">

      {/* Profile */}
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
        {/* BUG 12 FIXED: form now has a real onSubmit that calls authService.updateProfile */}
        <form className="max-w-md space-y-4" onSubmit={handleSaveUsername}>
          <div className="space-y-1">
            <label className="text-sm text-white/70" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="glass-input"
              disabled={savingProfile}
            />
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === 'ok' ? 'text-primary-400' : 'text-red-400'}`}>
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="glass-btn flex items-center gap-2 disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Username
          </button>
        </form>
      </section>

      {/* Security */}
      <section className="pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
        {/* BUG 13 FIXED: form now has a real onSubmit that calls authService.changePassword */}
        <form className="max-w-md space-y-4" onSubmit={handleChangePassword}>
          <div className="space-y-1">
            <label className="text-sm text-white/70" htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input"
              disabled={savingPassword}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/70" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input"
              disabled={savingPassword}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-white/70" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="glass-input"
              disabled={savingPassword}
            />
          </div>
          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.type === 'ok' ? 'text-primary-400' : 'text-red-400'}`}>
              {passwordMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="glass-btn flex items-center gap-2 disabled:opacity-50"
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </section>

      {/* Danger Zone */}
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

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setDeleteError('') }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card relative z-10 w-full max-w-sm p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Delete Account?</h2>
              </div>
              <p className="text-white/80 text-sm">
                This action is permanent and will wipe all your conversations and settings.
              </p>
              {/* BUG 9 FIXED: added password input — authService.deleteAccount(password) requires it.
                  Without this field, the API always returns 422 / 403. */}
              <div className="space-y-1">
                <label className="text-sm text-white/70" htmlFor="deletePassword">
                  Enter your password to confirm
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input"
                  disabled={deletingAccount}
                />
              </div>
              {deleteError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{deleteError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setDeleteError('') }}
                  className="glass-btn flex-1"
                  disabled={deletingAccount}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 flex-1 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )

  // ── Layout ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'appearance', label: 'Appearance',  icon: Palette  },
    { id: 'timer',      label: 'Timer & Focus', icon: Timer  },
    { id: 'music',      label: 'Music Player', icon: Music   },
    { id: 'ai',         label: 'AI Models',    icon: Cpu     },
    { id: 'account',    label: 'Account',      icon: UserIcon },
  ] as const

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-surface-900 overflow-hidden">

      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-white/5 backdrop-blur-md shrink-0 flex flex-row md:flex-col p-4 gap-2 overflow-x-auto md:overflow-y-auto">
        <h2 className="hidden md:block text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 px-2">
          Settings
        </h2>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'appearance' && renderAppearance()}
          {activeTab === 'timer'      && renderTimer()}
          {activeTab === 'music'      && renderMusic()}
          {activeTab === 'ai'         && renderAI()}
          {activeTab === 'account'    && renderAccount()}
        </div>
      </main>
    </div>
  )
}