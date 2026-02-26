import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTimerStore } from '@/store/timerStore'
// BUG 1 FIXED: removed the inline `const useGreeting` definition that was
// shadowing the real hook. The local version returned a plain string computed
// once via useMemo and was never updated (stale after midnight). It also
// produced a string, but the real hook returns { greeting, emoji } — so any
// component that ever tries to destructure it would get undefined for emoji.
import { useGreeting } from '@/hooks/useGreeting'
import ThemeBackground from '@/components/ui/ThemeBackground'
import PomodoroTimer from '@/components/timer/PomodoroTimer'
import MusicPlayer from '@/components/music/MusicPlayer'

export default function HomePage() {
  const restoreTimer = useTimerStore(state => state.restoreTimer)

  // BUG 2 FIXED: the real useGreeting() returns { greeting: string, emoji: string }.
  // The original code called it as a string (`greeting, {user?.username}`) which
  // works for the inline hook but breaks completely once you switch to the real one.
  // Using destructuring here so the greeting and emoji render independently.
  const { greeting, emoji } = useGreeting()

  // Re-attach the setInterval after a page reload / navigation so the countdown
  // continues from where it left off (timerStore persists timeLeft but not intervalId)
  useEffect(() => {
    restoreTimer()
  }, [restoreTimer])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Layer (z-0) */}
      <div className="absolute inset-0 z-0">
        <ThemeBackground />
      </div>

      {/* Content Layer (z-10) */}
      <div className="relative z-10 h-full flex flex-col justify-between">

        {/* Top: Greeting */}
        <header className="pt-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-3xl md:text-4xl font-display font-semibold text-white tracking-wide drop-shadow-md">
              {greeting} {emoji}
            </h1>
          </motion.div>
        </header>

        {/* Center: Pomodoro Timer */}
        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
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
  )
}