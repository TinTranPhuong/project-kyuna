import { useQuery } from '@tanstack/react-query'
import { Clock, CheckCircle, Flame, FileText } from 'lucide-react'
// import { useAuthStore } from '@/store/authStore'
import { useGreeting } from '@/hooks/useGreeting'
import { dashboardService } from '@/services/dashboard.service'
import { StatCard } from '@/components/dashboard/StatCard'
import { FocusChart } from '@/components/dashboard/FocusChart'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { StreakTracker } from '@/components/dashboard/StreakTracker'
import { Skeleton } from '@/components/ui/Skeleton'

export const DashboardPage = () => {
  const { greeting, emoji } = useGreeting()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  dashboardService.getStats,
  })

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {greeting} {emoji}
        </h1>
        <p className="text-sm font-medium text-white/40">
          Here is your activity and focus overview.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Focus Time"
              value={stats?.total_focus_minutes ?? 0}
              unit="min"
              icon={<Clock size={20} />}
              color="teal"
            />
            <StatCard
              title="Completed Sessions"
              value={stats?.total_sessions ?? 0}
              icon={<CheckCircle size={20} />}
              color="blue"
            />
            <StatCard
              title="Current Streak"
              value={stats?.current_streak ?? 0}
              unit="days"
              icon={<Flame size={20} />}
              color="amber"
            />
            <StatCard
              title="Pages Translated"
              value={stats?.total_translations ?? 0}
              icon={<FileText size={20} />}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">

        {/* Left (2/3): Chart + Streak */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-base font-semibold text-white/90 mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              Focus History
            </h2>
            {isLoading ? (
              <Skeleton.Text lines={4} />
            ) : (
              <FocusChart dailyData={stats?.daily_focus_chart ?? []} />
            )}
          </div>

          {isLoading ? (
            <Skeleton.Card />
          ) : (
            <StreakTracker
              currentStreak={stats?.current_streak ?? 0}
              longestStreak={stats?.longest_streak ?? 0}
            />
          )}
        </div>

        {/* Right (1/3): Activity Feed */}
        <div className="bg-surface-900/50 border border-white/5 rounded-2xl p-6 shadow-lg backdrop-blur-sm flex flex-col h-[500px]">
          <h2 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            Recent Activity
          </h2>
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <Skeleton.Text lines={6} />
            ) : (
              <ActivityFeed />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default DashboardPage