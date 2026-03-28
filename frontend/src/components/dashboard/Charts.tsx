import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { useThemeStore, ACCENT_PALETTE } from '../../store/themeStore';

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const { accentColor, isDark } = useThemeStore();
  const accentMain = ACCENT_PALETTE[accentColor].main;
  const accentRgb = ACCENT_PALETTE[accentColor].rgb;

  const tooltipStyle = {
    backgroundColor: isDark ? '#18181b' : '#ffffff',
    border: `1px solid ${isDark ? '#2a2a38' : '#d4d4e0'}`,
    borderRadius: '10px',
    color: isDark ? '#fff' : '#0f0f1a',
    fontSize: '12px',
  };

  return (
    <Card className="col-span-2">
      <CardHeader title="Revenue Overview" subtitle="Monthly revenue from closed deals" icon={<TrendingUp size={16} />} />
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={accentMain} stopOpacity={0.3} />
              <stop offset="95%" stopColor={accentMain} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a38' : '#e4e4ee'} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: isDark ? '#6b7280' : '#7070a0', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: isDark ? '#6b7280' : '#7070a0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
          />
          <Area
            type="monotone" dataKey="revenue" stroke={accentMain} strokeWidth={2}
            fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: accentMain }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

interface PipelineChartProps {
  data: Array<{ stage: string; _count: number; _sum: { value: number } }>;
}

const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: '#6b7280',
  QUALIFICATION: '#3b82f6',
  PROPOSAL: '#f59e0b',
  NEGOTIATION: '#06b6d4',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospect', QUALIFICATION: 'Qualify', PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiate', CLOSED_WON: 'Won', CLOSED_LOST: 'Lost',
};

export const PipelineChart: React.FC<PipelineChartProps> = ({ data }) => {
  const { accentColor, isDark } = useThemeStore();
  const accentMain = ACCENT_PALETTE[accentColor].main;

  const tooltipStyle = {
    backgroundColor: isDark ? '#18181b' : '#ffffff',
    border: `1px solid ${isDark ? '#2a2a38' : '#d4d4e0'}`,
    borderRadius: '10px',
    color: isDark ? '#fff' : '#0f0f1a',
    fontSize: '12px',
  };

  const chartData = data.map((d) => ({
    stage: STAGE_LABELS[d.stage] || d.stage,
    count: d._count,
    value: d._sum?.value || 0,
  }));

  return (
    <Card>
      <CardHeader title="Pipeline by Stage" subtitle="Deal distribution across stages" icon={<BarChart2 size={16} />} />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a38' : '#e4e4ee'} vertical={false} />
          <XAxis dataKey="stage" tick={{ fill: isDark ? '#6b7280' : '#7070a0', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: isDark ? '#6b7280' : '#7070a0', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [value, name === 'count' ? 'Deals' : 'Value']}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={STAGE_COLORS[data[index]?.stage] || accentMain} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
  subtitle?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, title, subtitle }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const { isDark } = useThemeStore();

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((entry, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-400">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{entry.value}</span>
                <span className="text-gray-500 text-xs">{total > 0 ? `${Math.round((entry.value / total) * 100)}%` : '0%'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
