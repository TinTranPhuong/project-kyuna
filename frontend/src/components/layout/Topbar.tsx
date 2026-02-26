import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useGreeting } from '@/hooks/useGreeting'
import { cn } from '@/lib/utils'

// ─── Topbar ───────────────────────────────────────────────────────────────────

/**
 * Sticky top application bar.
 *
 * Left  : Dynamic greeting driven by time-of-day and the user's name.
 * Right : Live HH:MM:SS clock + user avatar that opens an account dropdown.
 */
export const Topbar = () => {
  // Individual selectors — only re-renders when the specific field changes.
  const user   = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  const { greeting, emoji } = useGreeting();
  const navigate  = useNavigate()

  const [time, setTime] = useState(new Date())
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ── Live clock (ticks every second) ──────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Close dropdown and navigate ───────────────────────────────────────────
  const handleNavigate = (path: string) => {
    setShowDropdown(false)
    navigate(path)
  }

  // First letter of username, or "U" fallback
  const initials = user?.username ? user.username.charAt(0).toUpperCase() : 'U'

  // HH:MM:SS in 24-hour format, using the browser's local timezone
  const clockDisplay = time.toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <header className="h-16 w-full glass-card border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30">

      {/* ── Left: Greeting ─────────────────────────────────────────────────── */}
      <h1 className="text-white/90 font-medium tracking-tight">
        {greeting}
        {emoji}
        {user?.username}
      </h1>

      {/* ── Right: Clock + Avatar ───────────────────────────────────────────── */}
      <div className="flex items-center space-x-6">

        {/* Live clock — hidden on small screens */}
        <div className="hidden md:block text-sm font-mono text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/5 tabular-nums">
          {clockDisplay}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(prev => !prev)}
            aria-label="Open user menu"
            aria-expanded={showDropdown}
            className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white shadow-lg hover:ring-2 hover:ring-primary-500/50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {initials}
          </button>

          {/* ── Dropdown menu ──────────────────────────────────────────────── */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-2 w-48 glass-card border border-white/10 p-1 shadow-2xl origin-top-right z-50"
              >
                {/* User info header */}
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs text-white/40 uppercase font-bold tracking-widest">
                    Account
                  </p>
                  <p className="text-sm text-white truncate font-medium mt-0.5">
                    {user?.email ?? 'Guest'}
                  </p>
                </div>

                <DropdownItem
                  icon={User}
                  label="Profile"
                  onClick={() => handleNavigate('/settings')}
                />
                <DropdownItem
                  icon={Settings}
                  label="Settings"
                  onClick={() => handleNavigate('/settings')}
                />

                <div className="h-px bg-white/5 my-1" />

                <DropdownItem
                  icon={LogOut}
                  label="Logout"
                  onClick={logout}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

// ─── DropdownItem ─────────────────────────────────────────────────────────────

interface DropdownItemProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  className?: string
}

/**
 * A single row inside the user dropdown menu.
 * Receives a typed LucideIcon component instead of `any`.
 */
const DropdownItem = ({ icon: Icon, label, onClick, className }: DropdownItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center px-3 py-2 text-sm text-white/70',
      'hover:bg-white/10 hover:text-white rounded-lg transition-colors group',
      className,
    )}
  >
    <Icon size={16} className="mr-3 shrink-0 opacity-50 group-hover:opacity-100" />
    {label}
  </button>
)

export default Topbar