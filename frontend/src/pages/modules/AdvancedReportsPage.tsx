import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, Users, Target, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { reportsService } from '../../services/reports.service';
import { Card } from '../../components/ui/Card';

const PERIOD_OPTIONS = [
  { label: 'Last 30 days', from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) },
  { label: 'Last 90 days', from: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { label: 'Last 6 months', from: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10) },
  { label: 'This year', from: `${new Date().getFullYear()}-01-01` },
  { label: 'All time', from: undefined },
];

export default function AdvancedReportsPage() {
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);
  const filters = { from: period.from, to: new Date().toISOString().slice(0, 10) };

  const { data: revenue } = useQuery({
    queryKey: ['report-revenue', period.from],
    queryFn: () => reportsService.getRevenue(filters),
  });

  const { data: conversion } = useQuery({
    queryKey: ['report-conversion', period.from],
    queryFn: () => reportsService.getConversion(filters),
  });

  const { data: teamPerf } = useQuery({
    queryKey: ['report-team', period.from],
    queryFn: () => reportsService.getTeamPerformance(filters),
  });

  const { data: leadSources } = useQuery({
    queryKey: ['report-sources', period.from],
    queryFn: () => reportsService.getLeadSources(filters),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Analytics</h1>
          <p className="text-white/50 text-sm mt-1">Revenue, conversion, and team performance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                period.label === p.label
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue KPIs */}
      {revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Revenue', value: `₹${revenue.totalRevenue?.toLocaleString('en-IN') || 0}`, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Deals Won', value: revenue.totalDeals || 0, icon: Target, color: 'text-blue-400' },
            { label: 'Avg Deal Value', value: `₹${Math.round(revenue.avgDealValue || 0).toLocaleString('en-IN')}`, icon: BarChart2, color: 'text-violet-400' },
          ].map(kpi => (
            <Card key={kpi.label} className="p-5 border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">{kpi.label}</p>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Conversion Rates */}
      {conversion && (
        <Card className="p-5 border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" /> Conversion Rates
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-white/50 text-sm">Lead → Won</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{conversion.leadConversionRate}%</p>
              <p className="text-white/30 text-xs mt-1">{conversion.wonLeads} of {conversion.totalLeads} leads</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Deal Win Rate</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{conversion.dealWinRate}%</p>
              <p className="text-white/30 text-xs mt-1">{conversion.wonDeals} of {conversion.totalDeals} deals</p>
            </div>
          </div>
        </Card>
      )}

      {/* Revenue by Month */}
      {revenue?.revenueByPeriod && Object.keys(revenue.revenueByPeriod).length > 0 && (
        <Card className="p-5 border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-400" /> Monthly Revenue
          </h2>
          <div className="space-y-2">
            {Object.entries(revenue.revenueByPeriod)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([month, value]) => {
                const maxVal = Math.max(...Object.values(revenue.revenueByPeriod) as number[]);
                const pct = maxVal ? ((value as number) / maxVal) * 100 : 0;
                return (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-white/50 text-xs w-20 shrink-0">{month}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white text-xs w-24 text-right">
                      ₹{(value as number).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Team Performance */}
      {teamPerf && teamPerf.length > 0 && (
        <Card className="p-5 border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> Team Performance
          </h2>
          <div className="space-y-3">
            {(teamPerf as any[])
              .sort((a, b) => b.revenue - a.revenue)
              .map((member: any) => (
                <div key={member.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-300 text-xs font-medium shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{member.name}</p>
                    <p className="text-white/40 text-xs capitalize">{member.role.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div className="flex gap-4 text-right shrink-0">
                    <div>
                      <p className="text-white text-sm font-semibold">{member.wonDeals}</p>
                      <p className="text-white/40 text-xs">deals won</p>
                    </div>
                    <div>
                      <p className="text-green-400 text-sm font-semibold">₹{member.revenue.toLocaleString('en-IN')}</p>
                      <p className="text-white/40 text-xs">revenue</p>
                    </div>
                    <div>
                      <p className="text-blue-400 text-sm font-semibold">{member.leads}</p>
                      <p className="text-white/40 text-xs">leads</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Lead Sources */}
      {leadSources && leadSources.length > 0 && (
        <Card className="p-5 border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" /> Lead Sources
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(
              (leadSources as any[]).reduce((acc: Record<string, number>, item: any) => {
                const src = item.source;
                acc[src] = (acc[src] || 0) + item._count.source;
                return acc;
              }, {})
            ).map(([source, count]) => (
              <div key={source} className="p-3 bg-white/5 rounded-xl">
                <p className="text-white/50 text-xs">{source.replace('_', ' ')}</p>
                <p className="text-white text-xl font-bold mt-1">{count as number}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
