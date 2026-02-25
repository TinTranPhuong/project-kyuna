import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Clock, Activity, MessageSquare, Languages } from 'lucide-react';

// Services & Components (Will show errors until implemented)
import { dashboardService } from '@/services/dashboard.service';
import FocusChart from '@/components/dashboard/FocusChart';
import StreakTracker from '@/components/dashboard/StreakTracker';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import Skeleton from '@/components/ui/Skeleton';
import StatCard from '@/components/dashboard/StatCard';

// --- Helper Component: Animated Counter ---
// Extracts the Framer Motion logic to keep the main component clean
const AnimatedNumber = ({ value }: { value: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    // Animates from 0 to the target value over 1.5 seconds on mount
    const controls = animate(count, value, { 
      duration: 1.5, 
      ease: 'easeOut' 
    });
    return () => controls.stop();
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
};

export default function DashboardPage() {
  // Fetch stats using React Query v5 syntax
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  // --- Loading State: Skeleton Layout ---
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 w-full">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48 mb-6" /> {/* Title Skeleton */}
          
          {/* Top Row Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          
          {/* Middle Row Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>

          {/* Bottom Row Skeleton */}
          <Skeleton className="h-64 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (isError || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-full text-white/50">
        <p>Failed to load dashboard statistics. Please try refreshing.</p>
      </div>
    );
  }

  // --- Success State: Render Dashboard ---
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 w-full scroll-smooth bg-surface-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-display font-bold text-white"
          >
            Overview
          </motion.h1>
        </header>

        {/* Top Row: Stat Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* We pass AnimatedNumber as a child or prop depending on your StatCard design. 
              Assuming StatCard accepts `value` as a ReactNode. */}
          <StatCard 
            title="Total Focus Time" 
            value={<><AnimatedNumber value={stats.totalFocusTime} /> <span className="text-sm text-white/50">mins</span></>}
            icon={<Clock className="w-5 h-5 text-primary-400" />}
          />
          <StatCard 
            title="Sessions Today" 
            value={<AnimatedNumber value={stats.sessionsToday} />}
            icon={<Activity className="w-5 h-5 text-primary-400" />}
          />
          <StatCard 
            title="Total Chats" 
            value={<AnimatedNumber value={stats.totalChats} />}
            icon={<MessageSquare className="w-5 h-5 text-primary-400" />}
          />
          <StatCard 
            title="Translations" 
            value={<AnimatedNumber value={stats.totalTranslations} />}
            icon={<Languages className="w-5 h-5 text-primary-400" />}
          />
        </motion.div>

        {/* Middle Row: Charts and Streaks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Focus History (Last 7 Days)</h2>
            <FocusChart data={stats.chartData} />
          </div>
          
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Consistency</h2>
            <StreakTracker 
              currentStreak={stats.currentStreak} 
              longestStreak={stats.longestStreak} 
            />
          </div>
        </motion.div>

        {/* Bottom Row: Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <ActivityFeed 
            recentChats={stats.recentChats} 
            recentTranslations={stats.recentTranslations} 
          />
        </motion.div>

      </div>
    </div>
  );
}