import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { RevenueChart, PipelineChart, DonutChart } from '../../components/dashboard/Charts';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';

export const ReportsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  const leadStatusData = [
    { name: 'New', value: 12, color: '#3b82f6' },
    { name: 'Qualified', value: 8, color: '#8b5cf6' },
    { name: 'Proposal', value: 5, color: '#f59e0b' },
    { name: 'Won', value: 15, color: '#22c55e' },
    { name: 'Lost', value: 3, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Business insights and performance metrics</p>
      </motion.div>

      {/* KPI summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: data.stats.leads.total, icon: <Users size={18} />, color: 'text-accent-muted', bg: 'bg-accent-10' },
            { label: 'Win Rate', value: `${data.stats.deals.total > 0 ? Math.round((data.stats.deals.wonThisMonth / data.stats.deals.total) * 100) : 0}%`, icon: <Target size={18} />, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Revenue Won', value: formatCurrency(data.stats.deals.wonValue), icon: <DollarSign size={18} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Lead Growth', value: `${data.stats.leads.growth > 0 ? '+' : ''}${data.stats.leads.growth}%`, icon: <TrendingUp size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map((kpi, i) => (
            <Card key={i} className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${kpi.bg} shrink-0`}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <p className="text-xl font-bold text-white mt-0.5">{kpi.value}</p>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Charts */}
      {!isLoading && data && (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RevenueChart data={data.monthlyRevenue} />
            <PipelineChart data={data.pipelineByStage} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DonutChart data={leadStatusData} title="Lead Status Distribution" subtitle="Current quarter" />
            <Card className="col-span-2">
              <h3 className="font-semibold text-white mb-4">Pipeline Summary</h3>
              <div className="space-y-3">
                {data.pipelineByStage.map((item: any) => (
                  <div key={item.stage} className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{item.stage.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min((item._count / 10) * 100, 100)}%`, background: 'linear-gradient(to right, var(--color-accent), #4338ca)' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right shrink-0">{item._count}</span>
                    <span className="text-xs font-medium text-green-400 w-20 text-right shrink-0">{formatCurrency(item._sum?.value || 0)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
};
