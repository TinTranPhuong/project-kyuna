import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

// Stores
import { useAuthStore } from '@/store/authStore';
import { useTimerStore } from '@/store/timerStore';
// Settings store would typically be used inside ThemeBackground, 
// but we ensure it's available for the ecosystem.
import { useSettingsStore } from '@/store/settingsStore';

// Components (These will show errors until implemented)
import ThemeBackground from '@/components/ThemeBackground';
import PomodoroTimer from '@/components/PomodoroTimer';
import MusicPlayer from '@/components/MusicPlayer';

// --- Helper Hook: useGreeting ---
// In a larger app, you'd extract this to '@/hooks/useGreeting'
const useGreeting = () => {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 16) return 'Good afternoon';
    return 'Good evening';
  }, []);
};

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const restoreTimer = useTimerStore((state) => state.restoreTimer);
  const greeting = useGreeting();

  // Restore the timer state on mount (e.g., if they navigated away and came back)
  useEffect(() => {
    if (restoreTimer) {
      restoreTimer();
    }
  }, [restoreTimer]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Layer (z-0) */}
      <div className="absolute inset-0 z-0">
        <ThemeBackground />
      </div>

      {/* Content Layer (z-10) */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        
        {/* Top Bar: Greeting */}
        <header className="pt-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-wide drop-shadow-md">
              {greeting}, {user?.username || 'Guest'}
            </h1>
          </motion.div>
        </header>

        {/* Center: Pomodoro Timer */}
        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
            // Framer Motion: Slide up and fade in on page mount
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 md:p-10 shadow-2xl">
              <PomodoroTimer />
            </div>
          </motion.div>
        </main>

        {/* Bottom: Music Player */}
        <footer className="w-full pb-6 px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          >
            <MusicPlayer />
          </motion.div>
        </footer>
        
      </div>
    </div>
  );
}