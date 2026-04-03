import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, TrendingUp, DollarSign, Users, Download, Plus, Pencil, Trash2,
  X, Target, MapPin, Star, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { exportService } from '../../services/export.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CountryRow {
  country: string;
  leads: number;
  deals: number;
  revenue: number;
}

interface CountryTarget {
  id: string;
  country: string;
  countryCode?: string;
  region?: string;
  targetRevenue: number;
  targetDeals: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

type SortKey = 'country' | 'leads' | 'deals' | 'revenue' | 'targetRevenue' | 'priority';

const FLAG_MAP: Record<string, string> = {
  IN: '🇮🇳', US: '🇺🇸', AE: '🇦🇪', GB: '🇬🇧', AU: '🇦🇺',
  SA: '🇸🇦', QA: '🇶🇦', KW: '🇰🇼', OM: '🇴🇲', BH: '🇧🇭',
  DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', SG: '🇸🇬', NZ: '🇳🇿',
  JP: '🇯🇵', CN: '🇨🇳', BR: '🇧🇷', ZA: '🇿🇦', NG: '🇳🇬', Unknown: '🌍',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'text-red-400 bg-red-400/10 border-red-400/20',
  MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  LOW:    'text-green-400 bg-green-400/10 border-green-400/20',
};

const REGIONS = ['North America', 'South America', 'Europe', 'Middle East', 'South Asia', 'East Asia', 'Africa', 'Oceania', 'Other'];

const EMPTY_FORM = {
  country: '', countryCode: '', region: '', targetRevenue: '', targetDeals: '',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH', notes: '', isActive: true,
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const CountryAnalyticsPage: React.FC = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CountryTarget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<CountryRow[]>({
    queryKey: ['country-analytics'],
    queryFn: async () => {
      const res = await api.get('/export/reports/country?format=json');
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery<CountryTarget[]>({
    queryKey: ['country-targets'],
    queryFn: async () => {
      const res = await api.get('/country-targets');
      return res.data?.data ?? res.data ?? [];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/country-targets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['country-targets'] }); toast.success('Country added'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to add'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/country-targets/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['country-targets'] }); toast.success('Country updated'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/country-targets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['country-targets'] }); toast.success('Country deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (t: CountryTarget) => {
    setEditing(t);
    setForm({
      country: t.country, countryCode: t.countryCode ?? '', region: t.region ?? '',
      targetRevenue: String(t.targetRevenue), targetDeals: String(t.targetDeals),
      priority: t.priority, notes: t.notes ?? '', isActive: t.isActive,
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      country: form.country.trim(),
      countryCode: form.countryCode.trim() || undefined,
      region: form.region || undefined,
      targetRevenue: parseFloat(form.targetRevenue) || 0,
      targetDeals: parseInt(form.targetDeals) || 0,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // ── Merged data ────────────────────────────────────────────────────────────
  const targetMap = Object.fromEntries(targets.map((t) => [t.country.toLowerCase(), t]));
  const analyticsMap = Object.fromEntries(analytics.map((r) => [r.country.toLowerCase(), r]));

  // All countries = union of targets + analytics
  const allCountries = Array.from(new Set([
    ...targets.map((t) => t.country),
    ...analytics.map((r) => r.country),
  ]));

  const merged = allCountries.map((country) => {
    const t = targetMap[country.toLowerCase()];
    const a = analyticsMap[country.toLowerCase()];
    return {
      country,
      countryCode: t?.countryCode,
      region: t?.region,
      priority: t?.priority ?? 'MEDIUM',
      isActive: t?.isActive ?? true,
      targetRevenue: t?.targetRevenue ?? 0,
      targetDeals: t?.targetDeals ?? 0,
      notes: t?.notes,
      leads: a?.leads ?? 0,
      deals: a?.deals ?? 0,
      revenue: a?.revenue ?? 0,
      hasTarget: !!t,
      targetId: t?.id,
      targetObj: t,
    };
  });

  const filtered = merged.filter((r) =>
    r.country.toLowerCase().includes(search.toLowerCase()) ||
    (r.region ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey as keyof typeof a] ?? 0;
    let bv: any = b[sortKey as keyof typeof b] ?? 0;
    if (sortKey === 'priority') {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      av = order[av as keyof typeof order] ?? 1;
      bv = order[bv as keyof typeof order] ?? 1;
    }
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  const totalRevenue = analytics.reduce((s, r) => s + r.revenue, 0);
  const totalDeals = analytics.reduce((s, r) => s + r.deals, 0);
  const totalLeads = analytics.reduce((s, r) => s + r.leads, 0);

  const handleExport = async () => {
    setExporting(true);
    try { await exportService.exportCountryReport('csv'); toast.success('Report downloaded'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const isLoading = analyticsLoading || targetsLoading;

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#06b6d422' }}>
            <Globe size={24} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Country Analytics</h1>
            <p className="text-gray-400 text-sm">Leads, deals and revenue by country — with targets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-border bg-surface-secondary text-sm text-gray-300 hover:text-white rounded-xl transition-all disabled:opacity-50">
            <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus size={16} /> Add Country
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Countries', value: allCountries.length, icon: Globe, color: '#06b6d4' },
          { label: 'Total Leads', value: totalLeads, icon: Users, color: '#8b5cf6' },
          { label: 'Total Deals', value: totalDeals, icon: TrendingUp, color: '#6366f1' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
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

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search country or region…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Globe size={15} />}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Globe size={40} className="text-gray-700" />
            <p className="text-gray-400 text-sm">No countries yet. Add one or import contacts with country info.</p>
            <Button onClick={openAdd} size="sm" className="mt-1"><Plus size={14} className="mr-1" /> Add Country</Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: '#', key: null },
                      { label: 'Country', key: 'country' },
                      { label: 'Region', key: null },
                      { label: 'Priority', key: 'priority' },
                      { label: 'Leads', key: 'leads' },
                      { label: 'Deals', key: 'deals' },
                      { label: 'Revenue', key: 'revenue' },
                      { label: 'Target Rev', key: 'targetRevenue' },
                      { label: 'Attainment', key: null },
                      { label: 'Actions', key: null },
                    ].map(({ label, key }) => (
                      <th key={label}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide ${key ? 'cursor-pointer select-none hover:text-gray-300 transition-colors' : ''}`}
                        onClick={() => key && toggleSort(key as SortKey)}>
                        <span className="flex items-center gap-1">
                          {label}
                          {key && <SortIcon k={key as SortKey} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                    const attainment = row.targetRevenue > 0 ? Math.min((row.revenue / row.targetRevenue) * 100, 100) : null;
                    const flag = FLAG_MAP[row.countryCode ?? row.country] ?? FLAG_MAP[row.country] ?? '🌍';

                    return (
                      <motion.tr key={row.country}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-surface-secondary transition-colors">

                        <td className="px-4 py-3 text-sm text-gray-600">{i + 1}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{flag}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{row.country}</p>
                              {row.countryCode && <p className="text-xs text-gray-600">{row.countryCode}</p>}
                            </div>
                            {!row.hasTarget && (
                              <span title="No target set" className="ml-1">
                                <AlertCircle size={13} className="text-gray-600" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-400">{row.region ?? '—'}</td>

                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[row.priority]}`}>
                            {row.priority}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-gray-600" />
                            <span className="text-sm text-white">{row.leads}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-gray-600" />
                            <span className="text-sm text-white">{row.deals}</span>
                            {row.targetDeals > 0 && (
                              <span className="text-xs text-gray-600">/ {row.targetDeals}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-green-400">
                          {formatCurrency(row.revenue)}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-400">
                          {row.targetRevenue > 0 ? formatCurrency(row.targetRevenue) : <span className="text-gray-700">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {attainment !== null ? (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 bg-surface-secondary rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${attainment}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.03 }}
                                  className={`h-full rounded-full ${attainment >= 80 ? 'bg-green-500' : attainment >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-9 text-right">{attainment.toFixed(0)}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 bg-surface-secondary rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${share}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.03 }}
                                  className="h-full rounded-full bg-accent"
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-9 text-right">{share.toFixed(1)}%</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => row.targetObj ? openEdit(row.targetObj) : openAdd()}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-violet-400 transition-colors"
                              title={row.hasTarget ? 'Edit target' : 'Add target'}
                            >
                              {row.hasTarget ? <Pencil size={14} /> : <Plus size={14} />}
                            </button>
                            {row.hasTarget && (
                              <button
                                onClick={() => setDeleteId(row.targetId!)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                title="Remove target"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals row */}
            <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-surface-secondary flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-400">{sorted.length} countries shown</span>
              <div className="flex gap-6 text-sm">
                <span className="text-white">{totalLeads} leads</span>
                <span className="text-white">{totalDeals} deals</span>
                <span className="text-green-400 font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Country Target' : 'Add Country Target'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Country Name *</label>
              <Input
                placeholder="e.g. India"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                required
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Country Code</label>
              <Input
                placeholder="e.g. IN"
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Region</label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent"
              >
                <option value="">Select region…</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Revenue</label>
              <Input
                type="number"
                placeholder="0"
                value={form.targetRevenue}
                onChange={(e) => setForm({ ...form, targetRevenue: e.target.value })}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Deals</label>
              <Input
                type="number"
                placeholder="0"
                value={form.targetDeals}
                onChange={(e) => setForm({ ...form, targetDeals: e.target.value })}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm text-gray-300">Active market</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea
                rows={2}
                placeholder="Strategy, key contacts, market conditions…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Country'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-surface-elevated border border-border rounded-2xl p-6 w-[340px] shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Remove Country Target</p>
                  <p className="text-xs text-gray-500">This will only remove the target — analytics data is preserved</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => deleteMut.mutate(deleteId!)}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
