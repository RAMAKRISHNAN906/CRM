import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, DollarSign, CheckSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { dashboardService } from '../services/dashboard.service';
import { useAuthStore } from '../store/authStore';
import { StatsCard } from '../components/dashboard/StatsCard';
import { RevenueChart, PipelineChart, DonutChart } from '../components/dashboard/Charts';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { formatCurrency } from '../utils/formatters';
import { SkeletonCard } from '../components/ui/Skeleton';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    staleTime: 5 * 60 * 1000,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const taskDonutData = data ? [
    { name: 'Completed', value: data.stats.tasks.completedThisMonth, color: '#22c55e' },
    { name: 'Overdue', value: data.stats.tasks.overdue, color: '#ef4444' },
    { name: 'Other', value: Math.max(0, data.stats.tasks.total - data.stats.tasks.completedThisMonth - data.stats.tasks.overdue), color: '#6b7280' },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-sm text-gray-400">
          <TrendingUp size={14} className="text-green-400" />
          <span>All systems operational</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">Failed to load dashboard data. Please refresh.</span>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Leads"
            value={data!.stats.leads.total.toLocaleString()}
            icon={<UserPlus size={20} />}
            trend={data!.stats.leads.growth}
            trendLabel={`${data!.stats.leads.thisMonth} new this month`}
            color="accent"
            delay={0}
          />
          <StatsCard
            title="Contacts"
            value={data!.stats.contacts.total.toLocaleString()}
            icon={<Users size={20} />}
            color="blue"
            subtitle="Total in database"
            delay={0.1}
          />
          <StatsCard
            title="Revenue Won"
            value={formatCurrency(data!.stats.deals.wonValue)}
            icon={<DollarSign size={20} />}
            color="green"
            subtitle={`${data!.stats.deals.wonThisMonth} deals won this month`}
            delay={0.2}
          />
          <StatsCard
            title="Tasks"
            value={data!.stats.tasks.total.toLocaleString()}
            icon={<CheckSquare size={20} />}
            color={data!.stats.tasks.overdue > 0 ? 'red' : 'cyan'}
            subtitle={data!.stats.tasks.overdue > 0 ? `${data!.stats.tasks.overdue} overdue` : 'All up to date'}
            delay={0.3}
          />
        </div>
      )}

      {/* Charts Row */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <RevenueChart data={data.monthlyRevenue} />
          <PipelineChart data={data.pipelineByStage} />
        </motion.div>
      )}

      {/* Bottom row */}
      {!isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2">
            <ActivityFeed
              activities={data.recentActivity}
              userName={user?.name?.split(' ')[0]}
            />
          </div>
          <DonutChart
            data={taskDonutData}
            title="Task Overview"
            subtitle="Your tasks this month"
          />
        </motion.div>
      )}
    </div>
  );
};
