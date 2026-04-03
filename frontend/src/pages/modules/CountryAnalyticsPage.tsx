import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { exportService } from '../../services/export.service';
import { Globe, TrendingUp, DollarSign, Users, Download } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface CountryRow {
  country: string;
  leads: number;
  deals: number;
  revenue: number;
}

const FLAG_MAP: Record<string, string> = {
  IN: '🇮🇳', US: '🇺🇸', AE: '🇦🇪', GB: '🇬🇧', AU: '🇦🇺',
  SA: '🇸🇦', QA: '🇶🇦', KW: '🇰🇼', OM: '🇴🇲', BH: '🇧🇭',
  DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', SG: '🇸🇬', Unknown: '🌍',
};

export const CountryAnalyticsPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const { data: rows = [], isLoading } = useQuery<CountryRow[]>({
    queryKey: ['country-analytics'],
    queryFn: async () => {
      const res = await api.get('/export/reports/country?format=json');
      return res.data;
    },
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalDeals = rows.reduce((s, r) => s + r.deals, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);

  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportService.exportCountryReport('csv');
      toast.success('Country report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#06b6d422' }}>
            <Globe size={24} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Country Analytics</h1>
            <p className="text-gray-400 text-sm">Leads, deals and revenue by country</p>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 border border-border bg-surface-secondary text-sm text-gray-300 hover:text-white rounded-xl transition-all disabled:opacity-50">
          <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Countries', value: rows.length, icon: Globe, color: '#06b6d4' },
          { label: 'Total Deals', value: totalDeals, icon: TrendingUp, color: '#6366f1' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-surface-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Country Table */}
      <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading analytics...</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Globe size={40} className="text-gray-700" />
            <p className="text-gray-400 text-sm">No country data yet. Add contacts with country info.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['#', 'Country', 'Leads', 'Deals', 'Revenue', 'Revenue Share'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                  return (
                    <motion.tr key={row.country}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{FLAG_MAP[row.country] ?? '🌍'}</span>
                          <span className="text-sm font-medium text-white">{row.country}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users size={13} className="text-gray-600" />
                          <span className="text-sm text-white">{row.leads}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={13} className="text-gray-600" />
                          <span className="text-sm text-white">{row.deals}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-400">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-surface-secondary rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${share}%` }}
                              transition={{ duration: 0.6, delay: i * 0.04 }}
                              className="h-full rounded-full bg-accent"
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-10 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals row */}
            <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-surface-secondary">
              <span className="text-sm font-medium text-gray-400">Total ({rows.length} countries)</span>
              <div className="flex gap-8 text-sm">
                <span className="text-white">{totalLeads} leads</span>
                <span className="text-white">{totalDeals} deals</span>
                <span className="text-green-400 font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
