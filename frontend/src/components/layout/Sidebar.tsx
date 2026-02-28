import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, MessageSquare, Languages, BarChart2,
  StickyNote, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { useNoteStore } from '@/store/noteStore';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home,         label: 'Focus',     path: '/'          },
  { icon: MessageSquare,label: 'Chat',      path: '/chat'      },
  { icon: Languages,    label: 'Translate', path: '/translate' },
  { icon: BarChart2,    label: 'Dashboard', path: '/dashboard' },
];

export const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  const setManagerOpen = useNoteStore(state => state.setManagerOpen);
  const isExpanded = isHovered; // Now relies purely on hover

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 300 : 120 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative z-40 flex flex-col shrink-0',
        'bg-black/40 backdrop-blur-md border border-white/10',
        'm-4 h-[calc(100vh-32px)] rounded-[32px] py-6 shadow-2xl',
        isExpanded && 'shadow-black/50'
      )}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Main Navigation (Single unified list) */}
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 custom-scrollbar">
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.path} item={item} isExpanded={isExpanded} />
          ))}

          {/* Notes Manager Button */}
          <Tooltip content="Notes" position="right" className={isExpanded ? 'hidden' : ''}>
            <button
              onClick={() => setManagerOpen(true)}
              className={cn(
                'flex items-center transition-all duration-200 group relative shrink-0',
                isExpanded ? 'p-3 mx-2 rounded-2xl' : 'p-3 mx-auto w-12 h-12 justify-center rounded-full',
                'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
              )}
            >
              <StickyNote size={18} className="shrink-0" />
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left"
                >
                  Notes
                </motion.span>
              )}
            </button>
          </Tooltip>
        </nav>
      </div>
    </motion.aside>
  );
};

interface SidebarLinkProps {
  item: NavItem;
  isExpanded: boolean;
}

const SidebarLink = ({ item, isExpanded }: SidebarLinkProps) => (
  <Tooltip content={item.label} position="right" className={isExpanded ? 'hidden' : ''}>
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center transition-all duration-200 group relative shrink-0',
          isExpanded ? 'p-3 mx-2 rounded-2xl' : 'p-3 mx-auto w-12 h-12 justify-center rounded-full',
          isActive
            ? 'bg-white/10 text-white shadow-inner border border-white/5'
            : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
        )
      }
    >
      <item.icon size={18} className="shrink-0" />
      {isExpanded && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left"
        >
          {item.label}
        </motion.span>
      )}
    </NavLink>
  </Tooltip>
);

export default Sidebar;