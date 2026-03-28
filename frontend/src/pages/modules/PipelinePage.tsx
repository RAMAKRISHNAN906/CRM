import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { dealsService } from '../../services/deals.service';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  PROSPECTING:  { label: 'Prospecting',  color: 'text-gray-400',   bgColor: 'bg-gray-500/10',   borderColor: 'border-gray-500/20' },
  QUALIFICATION:{ label: 'Qualification',color: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/20' },
  PROPOSAL:     { label: 'Proposal',     color: 'text-amber-400',  bgColor: 'bg-amber-500/10',  borderColor: 'border-amber-500/20' },
  NEGOTIATION:  { label: 'Negotiation',  color: 'text-cyan-400',   bgColor: 'bg-cyan-500/10',   borderColor: 'border-cyan-500/20' },
  CLOSED_WON:   { label: 'Closed Won',   color: 'text-green-400',  bgColor: 'bg-green-500/10',  borderColor: 'border-green-500/20' },
  CLOSED_LOST:  { label: 'Closed Lost',  color: 'text-red-400',    bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/20' },
};

export const PipelinePage: React.FC = () => {
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: dealsService.getPipeline,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Sales Pipeline</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visual Kanban board of your deals</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-surface-secondary border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <div className="grid gap-4 min-w-[900px] xl:min-w-0" style={{ gridTemplateColumns: 'repeat(6, minmax(180px, 1fr))' }}>
          {pipeline?.map((col: any, colIdx: number) => {
            const config = STAGE_CONFIG[col.stage] || STAGE_CONFIG.PROSPECTING;
            return (
              <motion.div
                key={col.stage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.08 }}
                className="flex flex-col gap-3 min-w-[200px]"
              >
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
                  <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{col.count}</span>
                    <span className={`text-xs font-medium ${config.color}`}>{formatCurrency(col.totalValue)}</span>
                  </div>
                </div>

                {/* Deal cards */}
                <div className="flex flex-col gap-2 min-h-[200px]">
                  {col.deals.length === 0 ? (
                    <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-border text-gray-600 text-xs">
                      No deals
                    </div>
                  ) : (
                    col.deals.map((deal: any, i: number) => (
                      <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: colIdx * 0.08 + i * 0.04 }}
                        className="p-3 rounded-xl bg-surface-secondary border border-border hover:border-border-strong transition-all hover:shadow-card-hover cursor-pointer group"
                      >
                        <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-accent-light transition-colors">{deal.title}</h4>
                        {deal.contact && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{deal.contact.firstName} {deal.contact.lastName}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-semibold text-green-400">{formatCurrency(deal.value)}</span>
                          <span className="text-xs text-gray-600">{deal.probability}%</span>
                        </div>
                        {deal.expectedClose && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                            <Calendar size={10} />
                            <span>{formatDate(deal.expectedClose, 'MMM dd')}</span>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
};
