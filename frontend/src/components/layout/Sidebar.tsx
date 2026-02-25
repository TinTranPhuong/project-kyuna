import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  MessageSquare,
  Languages,
  BarChart2,
  Settings,
  LogOut,
  Pin,
  PinOff,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  icon: LucideIcon
  label: string
  path: string
}

// ─── Navigation Config ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { icon: Home,         label: 'Focus',     path: '/'          },
  { icon: MessageSquare,label: 'Chat',      path: '/chat'      },
  { icon: Languages,    label: 'Translate', path: '/translate' },
  { icon: BarChart2,    label: 'Dashboard', path: '/dashboard' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

/**
 * Collapsible side-navigation panel.
 *
 * Behaviour:
 *  - Collapsed (64px) by default — shows only icons.
 *  - Expands (220px) on hover, or permanently when pinned.
 *  - The pin toggle button appears only when expanded.
 *
 * Layout note: this component uses `relative` positioning and sits inside
 * a `flex` row in MainLayout. Do NOT change it to `fixed` — that would break
 * the flex layout and cause the main content to overlap the sidebar.
 */
export const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned]   = useState(false)

  // Single-field selector avoids re-renders on unrelated auth state changes
  const logout = useAuthStore(state => state.logout)

  const isExpanded = isHovered || isPinned

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative flex-shrink-0 h-full z-40',
        'flex flex-col',
        'bg-surface-900/80 backdrop-blur-xl',
        'border-r border-white/10',
        isExpanded && 'shadow-2xl shadow-black/50',
      )}
    >
      {/* ── Branding & Pin Toggle ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-16 px-4 shrink-0">
        <div className={cn('flex items-center gap-3', !isExpanded && 'justify-center w-full')}>
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
            <span className="font-bold text-white text-xl leading-none">L</span>
          </div>

          {/* App name — only visible when expanded */}
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="font-semibold text-white tracking-tight whitespace-nowrap overflow-hidden"
            >
              Kyuna Space
            </motion.span>
          )}
        </div>

        {/* Pin toggle — only visible when expanded.
            Shows PinOff icon (action = "unpin") when currently pinned.
            Shows Pin icon (action = "pin")   when currently unpinned. */}
        {isExpanded && (
          <button
            onClick={() => setIsPinned(prev => !prev)}
            aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        )}
      </div>

      {/* ── Main Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-hidden">
        {NAV_ITEMS.map(item => (
          <SidebarLink key={item.path} item={item} isExpanded={isExpanded} />
        ))}
      </nav>

      {/* ── Bottom Section ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-6 space-y-1">
        {BOTTOM_ITEMS.map(item => (
          <SidebarLink key={item.path} item={item} isExpanded={isExpanded} />
        ))}

        {/* Logout — tooltip shown only when sidebar is collapsed */}
        <Tooltip content="Logout" position="right" className={isExpanded ? 'hidden' : ''}>
          <button
            onClick={logout}
            aria-label="Logout"
            className={cn(
              'flex items-center w-full p-2.5 rounded-xl transition-all group',
              'text-white/50 hover:bg-red-500/10 hover:text-red-400',
              !isExpanded && 'justify-center',
            )}
          >
            <LogOut size={22} className="shrink-0" />
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-3 font-medium"
              >
                Logout
              </motion.span>
            )}
          </button>
        </Tooltip>
      </div>
    </motion.aside>
  )
}

// ─── SidebarLink ──────────────────────────────────────────────────────────────

interface SidebarLinkProps {
  item: NavItem
  isExpanded: boolean
}

/**
 * Individual navigation link.
 * Shows a tooltip (with the route label) when the sidebar is collapsed.
 */
const SidebarLink = ({ item, isExpanded }: SidebarLinkProps) => (
  <Tooltip content={item.label} position="right" className={isExpanded ? 'hidden' : ''}>
    <NavLink
      to={item.path}
      end={item.path === '/'}   // exact match for root to avoid matching every route
      className={({ isActive }) =>
        cn(
          'flex items-center p-2.5 rounded-xl transition-all duration-200 group relative',
          isActive
            ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
            : 'text-white/50 hover:bg-white/5 hover:text-white',
          !isExpanded && 'justify-center',
        )
      }
    >
      <item.icon size={22} className="shrink-0" />

      {isExpanded && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="ml-3 font-medium whitespace-nowrap"
        >
          {item.label}
        </motion.span>
      )}
    </NavLink>
  </Tooltip>
)

export default Sidebar