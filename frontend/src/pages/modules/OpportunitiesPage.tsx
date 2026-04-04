import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lightbulb, Plus, Pencil, Trash2, X, Search, LayoutList, Kanban,
  DollarSign, TrendingUp, Target, Trophy, ChevronDown, ChevronUp,
  Calendar, Users, Building2, Tag, Star, AlertCircle, Filter,
  MoreVertical, ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react';
import { opportunitiesService } from '../../services/opportunities.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Opp {
  id: string;
  title: string;
  description?: string;
  stage: OppStage;
  type: OppType;
  priority: Priority;
  value: number;
  currency: string;
  probability: number;
  closeDate?: string;
  source?: string;
  tags: string[];
  notes?: string;
  lostReason?: string;
  createdAt: string;
  owner:    { id: string; name: string; avatar?: string };
  assignee?: { id: string; name: string; avatar?: string };
  contact?:  { id: string; firstName: string; lastName: string; email?: string };
  account?:  { id: string; name: string };
}

type OppStage =
  | 'OPPORTUNITY' | 'DEMO' | 'PROPOSAL' | 'NEGOTIATION'
  | 'FINALISATION' | 'ORDER_RELEASE' | 'CLOSED_WON' | 'CLOSED_LOST'
  // legacy
  | 'PROSPECTING' | 'QUALIFICATION' | 'NEEDS_ANALYSIS' | 'VALUE_PROPOSITION' | 'DECISION_MAKERS';

type OppType    = 'NEW_BUSINESS' | 'EXISTING_BUSINESS' | 'RENEWAL' | 'UPGRADE';
type Priority   = 'LOW' | 'MEDIUM' | 'HIGH';
type ViewMode   = 'list' | 'kanban';

interface Stats {
  total: number; won: number; lost: number; winRate: number;
  totalPipelineValue: number; avgDealSize: number; wonValue: number; avgProbability: number;
  byStage: { stage: string; _count: number; _sum: { value: number } }[];
}

interface KanbanCol {
  stage: OppStage;
  opportunities: Opp[];
  totalValue: number;
}

// ── Config ────────────────────────────────────────────────────────────────────
// Owner's exact sales flow
const STAGES: { key: OppStage; label: string; color: string; prob: number }[] = [
  { key: 'OPPORTUNITY',   label: 'Opportunity',       color: '#6366f1', prob: 10  },
  { key: 'DEMO',          label: 'Demo',              color: '#8b5cf6', prob: 25  },
  { key: 'PROPOSAL',      label: 'Proposal',          color: '#06b6d4', prob: 45  },
  { key: 'NEGOTIATION',   label: 'Negotiation',       color: '#f59e0b', prob: 65  },
  { key: 'FINALISATION',  label: 'Finalisation',      color: '#f97316', prob: 85  },
  { key: 'ORDER_RELEASE', label: 'Order Release',     color: '#a855f7', prob: 95  },
  { key: 'CLOSED_WON',   label: 'Closed Won',        color: '#10b981', prob: 100 },
  { key: 'CLOSED_LOST',  label: 'Closed Lost',       color: '#ef4444', prob: 0   },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const TYPES: { key: OppType; label: string }[] = [
  { key: 'NEW_BUSINESS',      label: 'New Business'      },
  { key: 'EXISTING_BUSINESS', label: 'Existing Business' },
  { key: 'RENEWAL',           label: 'Renewal'           },
  { key: 'UPGRADE',           label: 'Upgrade'           },
];

const SOURCES = ['Website','Referral','Cold Call','Email Campaign','Trade Show','LinkedIn','Partner','Other'];

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH:   'text-red-400 bg-red-400/10 border-red-400/20',
  MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  LOW:    'text-green-400 bg-green-400/10 border-green-400/20',
};

const EMPTY_FORM = {
  title: '', description: '', stage: 'OPPORTUNITY' as OppStage,
  type: 'NEW_BUSINESS' as OppType, priority: 'MEDIUM' as Priority,
  value: '', currency: 'USD', probability: '10',
  closeDate: '', source: '', tags: '', notes: '',
  contactId: '', accountId: '', assigneeId: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const weighted = (opps: Opp[]) =>
  opps.reduce((s, o) => s + o.value * (o.probability / 100), 0);

// ── Page ──────────────────────────────────────────────────────────────────────
export const OpportunitiesPage: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [view, setView]         = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Opp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Opp | null>(null);
  const [stageTarget, setStageTarget]   = useState<{ opp: Opp; stage: OppStage } | null>(null);
  const [lostReason, setLostReason]     = useState('');
  const [form, setForm]         = useState(EMPTY_FORM);
  const [search, setSearch]     = useState('');
  const [filterStage, setFilterStage]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [sortKey, setSortKey]   = useState<'value' | 'probability' | 'closeDate' | 'createdAt'>('createdAt');
  const [sortAsc, setSortAsc]   = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery<Stats>({
    queryKey: ['opp-stats'],
    queryFn: () => opportunitiesService.stats().then((r) => r.data?.data ?? r.data),
  });

  const { data: listData, isLoading } = useQuery<{ data: Opp[] }>({
    queryKey: ['opportunities', filterStage, filterPriority, filterType],
    queryFn: () => opportunitiesService.list({
      limit: 200,
      stage: filterStage || undefined,
      priority: filterPriority || undefined,
      type: filterType || undefined,
    }).then((r) => r.data),
  });

  const { data: kanbanData } = useQuery<KanbanCol[]>({
    queryKey: ['opp-kanban'],
    queryFn: () => opportunitiesService.kanban().then((r) => r.data?.data ?? r.data),
    enabled: view === 'kanban',
  });

  const opps: Opp[] = listData?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['opportunities'] });
    qc.invalidateQueries({ queryKey: ['opp-stats'] });
    qc.invalidateQueries({ queryKey: ['opp-kanban'] });
  };

  const createMut = useMutation({
    mutationFn: (data: any) => opportunitiesService.create(data),
    onSuccess: () => { invalidate(); toast.success('Opportunity created'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => opportunitiesService.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Opportunity updated'); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update'),
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage, lost }: { id: string; stage: string; lost?: string }) =>
      opportunitiesService.stage(id, stage, lost),
    onSuccess: () => { invalidate(); toast.success('Stage updated'); setStageTarget(null); setLostReason(''); },
    onError: () => toast.error('Failed to update stage'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => opportunitiesService.delete(id),
    onSuccess: () => { invalidate(); toast.success('Opportunity deleted'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (o: Opp) => {
    setEditing(o);
    setForm({
      title: o.title, description: o.description ?? '',
      stage: o.stage, type: o.type, priority: o.priority,
      value: String(o.value), currency: o.currency,
      probability: String(o.probability),
      closeDate: o.closeDate ? o.closeDate.split('T')[0] : '',
      source: o.source ?? '', tags: o.tags.join(', '),
      notes: o.notes ?? '',
      contactId: o.contact?.id ?? '',
      accountId: o.account?.id ?? '',
      assigneeId: o.assignee?.id ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      stage:       form.stage,
      type:        form.type,
      priority:    form.priority,
      value:       parseFloat(form.value) || 0,
      currency:    form.currency,
      probability: parseInt(form.probability) || 0,
      closeDate:   form.closeDate || undefined,
      source:      form.source || undefined,
      tags:        form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes:       form.notes.trim() || undefined,
      contactId:   form.contactId || undefined,
      accountId:   form.accountId || undefined,
      assigneeId:  form.assigneeId || undefined,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  // Auto-fill probability when stage changes
  const handleStageChange = (stage: OppStage) => {
    const s = STAGE_MAP[stage];
    setForm((f) => ({ ...f, stage, probability: String(s?.prob ?? f.probability) }));
  };

  // ── Filtering & Sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = opps.filter((o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (o.contact && `${o.contact.firstName} ${o.contact.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
      (o.account?.name ?? '').toLowerCase().includes(search.toLowerCase())
    );
    arr = [...arr].sort((a, b) => {
      let av: any = a[sortKey] ?? 0;
      let bv: any = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [opps, search, sortKey, sortAsc]);

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
      : null;

  // ── Stage-change via inline menu ───────────────────────────────────────────
  const handleStageMove = (opp: Opp, stage: OppStage) => {
    if (stage === 'CLOSED_LOST') {
      setStageTarget({ opp, stage });
    } else {
      stageMut.mutate({ id: opp.id, stage });
    }
    setOpenMenu(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const stats = statsData;

  return (
    <div className="p-6 space-y-6" onClick={() => setOpenMenu(null)}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-500/20">
            <Lightbulb size={24} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Opportunities</h1>
            <p className="text-gray-400 text-sm">Track and manage your sales opportunities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-border rounded-xl overflow-hidden">
            {(['list', 'kanban'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                  view === v ? 'bg-accent-20 text-accent-light' : 'text-gray-400 hover:text-white'
                }`}>
                {v === 'list' ? <LayoutList size={15} /> : <Kanban size={15} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus size={16} /> New Opportunity
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pipeline Value',  value: formatCurrency(stats.totalPipelineValue), icon: DollarSign, color: '#6366f1' },
            { label: 'Won Revenue',     value: formatCurrency(stats.wonValue),            icon: Trophy,     color: '#10b981' },
            { label: 'Win Rate',        value: `${stats.winRate}%`,                       icon: Target,     color: '#f59e0b' },
            { label: 'Weighted Value',  value: formatCurrency(weighted(opps)),             icon: TrendingUp, color: '#06b6d4' },
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
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input placeholder="Search opportunities…" value={search}
            onChange={(e) => setSearch(e.target.value)} icon={<Search size={15} />} />
        </div>
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm text-gray-300 focus:outline-none focus:border-accent">
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm text-gray-300 focus:outline-none focus:border-accent">
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-surface-secondary text-sm text-gray-300 focus:outline-none focus:border-accent">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {(filterStage || filterPriority || filterType || search) && (
          <button onClick={() => { setFilterStage(''); setFilterPriority(''); setFilterType(''); setSearch(''); }}
            className="px-3 py-2 rounded-xl border border-border text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 flex flex-col items-center gap-3">
                  <Lightbulb size={40} className="text-gray-700" />
                  <p className="text-gray-400 text-sm">No opportunities found.</p>
                  <Button onClick={openAdd} size="sm"><Plus size={14} className="mr-1" /> New Opportunity</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Opportunity</th>
                        <th className="px-4 py-3 text-left">Stage</th>
                        <th className="px-4 py-3 text-left">Priority</th>
                        <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-300"
                          onClick={() => toggleSort('value')}>
                          <span className="flex items-center gap-1">Value <SortIcon k="value" /></span>
                        </th>
                        <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-300"
                          onClick={() => toggleSort('probability')}>
                          <span className="flex items-center gap-1">Prob% <SortIcon k="probability" /></span>
                        </th>
                        <th className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-300"
                          onClick={() => toggleSort('closeDate')}>
                          <span className="flex items-center gap-1">Close Date <SortIcon k="closeDate" /></span>
                        </th>
                        <th className="px-4 py-3 text-left">Contact / Account</th>
                        <th className="px-4 py-3 text-left">Owner</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((opp, i) => {
                        const stg = STAGE_MAP[opp.stage];
                        const isPast = opp.closeDate && new Date(opp.closeDate) < new Date()
                          && opp.stage !== 'CLOSED_WON' && opp.stage !== 'CLOSED_LOST';

                        return (
                          <motion.tr key={opp.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/50 hover:bg-surface-secondary transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-white">{opp.title}</p>
                                {opp.type && (
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {TYPES.find((t) => t.key === opp.type)?.label}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-medium px-2 py-1 rounded-full border"
                                style={{ color: stg?.color, background: `${stg?.color}18`, borderColor: `${stg?.color}30` }}>
                                {stg?.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[opp.priority]}`}>
                                {opp.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-400">
                              {formatCurrency(opp.value, opp.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                                  <div className="h-full rounded-full bg-accent"
                                    style={{ width: `${opp.probability}%` }} />
                                </div>
                                <span className="text-xs text-gray-400">{opp.probability}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {isPast && <AlertCircle size={13} className="text-red-400" />}
                                <span className={`text-sm ${isPast ? 'text-red-400' : 'text-gray-300'}`}>
                                  {opp.closeDate ? formatDate(opp.closeDate) : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                {opp.contact && (
                                  <p className="text-white">{opp.contact.firstName} {opp.contact.lastName}</p>
                                )}
                                {opp.account && (
                                  <p className="text-xs text-gray-500">{opp.account.name}</p>
                                )}
                                {!opp.contact && !opp.account && <span className="text-gray-600">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Avatar name={opp.owner.name} src={opp.owner.avatar} size="sm" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative flex items-center gap-1">
                                <button onClick={() => openEdit(opp)}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-violet-400 transition-colors">
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === opp.id ? null : opp.id); }}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-200 transition-colors">
                                  <MoreVertical size={14} />
                                </button>
                                <button onClick={() => setDeleteTarget(opp)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                                  <Trash2 size={14} />
                                </button>

                                {/* Stage quick-move dropdown */}
                                <AnimatePresence>
                                  {openMenu === opp.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      className="absolute right-0 top-8 z-50 w-52 bg-surface-overlay border border-border rounded-xl shadow-dropdown overflow-hidden"
                                      onClick={(e) => e.stopPropagation()}>
                                      <p className="px-3 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide border-b border-border">
                                        Move to Stage
                                      </p>
                                      {STAGES.filter((s) => s.key !== opp.stage).map((s) => (
                                        <button key={s.key}
                                          onClick={() => handleStageMove(opp, s.key)}
                                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors text-left">
                                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                          {s.label}
                                          {s.key === 'CLOSED_WON' && <CheckCircle2 size={13} className="ml-auto text-green-400" />}
                                          {s.key === 'CLOSED_LOST' && <XCircle size={13} className="ml-auto text-red-400" />}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Footer summary */}
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-surface-secondary text-sm flex-wrap gap-2">
                    <span className="text-gray-400">{filtered.length} opportunities</span>
                    <div className="flex gap-6">
                      <span className="text-gray-400">
                        Total: <span className="text-white font-semibold">
                          {formatCurrency(filtered.reduce((s, o) => s + o.value, 0))}
                        </span>
                      </span>
                      <span className="text-gray-400">
                        Weighted: <span className="text-violet-300 font-semibold">
                          {formatCurrency(weighted(filtered))}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === 'kanban' && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: `${STAGES.length * 280}px` }}>
                {(kanbanData ?? STAGES.map((s) => ({ stage: s.key, opportunities: [], totalValue: 0 }))).map((col) => {
                  const stg = STAGE_MAP[col.stage as OppStage];
                  const colOpps = col.opportunities.filter((o) =>
                    o.title.toLowerCase().includes(search.toLowerCase())
                  );
                  return (
                    <div key={col.stage} className="w-64 shrink-0 flex flex-col gap-2">
                      {/* Column header */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: stg?.color }} />
                          <span className="text-xs font-semibold text-gray-300">{stg?.label}</span>
                          <span className="text-xs text-gray-600 bg-surface-secondary rounded-full px-1.5 py-0.5">
                            {colOpps.length}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatCurrency(col.totalValue)}</span>
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2 min-h-[120px]">
                        {colOpps.map((opp) => (
                          <motion.div key={opp.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-border bg-surface-elevated p-3 hover:border-accent/30 transition-colors cursor-pointer group"
                            onClick={() => openEdit(opp)}>
                            <p className="text-sm font-medium text-white leading-snug mb-2">{opp.title}</p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-green-400">
                                {formatCurrency(opp.value, opp.currency)}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_STYLES[opp.priority]}`}>
                                {opp.priority}
                              </span>
                            </div>
                            {opp.contact && (
                              <p className="text-xs text-gray-500 mb-1">
                                {opp.contact.firstName} {opp.contact.lastName}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-center gap-1.5">
                                <div className="w-10 h-1 rounded-full bg-surface-secondary overflow-hidden">
                                  <div className="h-full rounded-full bg-accent"
                                    style={{ width: `${opp.probability}%` }} />
                                </div>
                                <span className="text-xs text-gray-600">{opp.probability}%</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(opp); }}
                                  className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-violet-400">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(opp); }}
                                  className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {/* Add card in column */}
                        <button
                          onClick={() => { setForm({ ...EMPTY_FORM, stage: col.stage as OppStage }); setEditing(null); setShowModal(true); }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-dashed border-border text-gray-600 hover:text-gray-400 hover:border-gray-600 text-sm transition-colors">
                          <Plus size={14} /> Add opportunity
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={showModal} onClose={closeModal}
        title={editing ? 'Edit Opportunity' : 'New Opportunity'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">

            {/* Title */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Title *</label>
              <Input placeholder="e.g. Enterprise SaaS deal — Acme Corp"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stage</label>
              <select value={form.stage}
                onChange={(e) => handleStageChange(e.target.value as OppStage)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OppType })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>

            {/* Value + Currency */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Value</label>
              <div className="flex gap-2">
                <select value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-20 px-2 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                  {['USD','EUR','GBP','INR','AED','SAR'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <Input type="number" placeholder="0" value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })} min={0} />
              </div>
            </div>

            {/* Probability */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Probability ({form.probability}%)</label>
              <input type="range" min={0} max={100} value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
                className="w-full mt-2 accent-violet-500" />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <div className="flex gap-2">
                {(['HIGH','MEDIUM','LOW'] as Priority[]).map((p) => (
                  <button key={p} type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                      form.priority === p ? PRIORITY_STYLES[p] : 'border-border text-gray-500 hover:text-gray-300'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Close Date */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Expected Close Date</label>
              <Input type="date" value={form.closeDate}
                onChange={(e) => setForm({ ...form, closeDate: e.target.value })} />
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                <option value="">Select source…</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
              <Input placeholder="e.g. enterprise, q2, strategic"
                value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea rows={2} placeholder="Opportunity details…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent resize-none" />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea rows={2} placeholder="Internal notes, next steps…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Lost Reason Modal ── */}
      <AnimatePresence>
        {stageTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-surface-elevated border border-border rounded-2xl p-6 w-[400px] shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <XCircle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Mark as Closed Lost</p>
                  <p className="text-xs text-gray-500">{stageTarget.opp.title}</p>
                </div>
              </div>
              <label className="block text-xs text-gray-400 mb-2">Reason for losing (optional)</label>
              <textarea rows={3} placeholder="e.g. Price too high, went with competitor…"
                value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent resize-none mb-4" />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => { setStageTarget(null); setLostReason(''); }}>Cancel</Button>
                <Button variant="danger"
                  onClick={() => stageMut.mutate({ id: stageTarget.opp.id, stage: 'CLOSED_LOST', lost: lostReason })}
                  disabled={stageMut.isPending}>
                  {stageMut.isPending ? 'Updating…' : 'Mark Lost'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-surface-elevated border border-border rounded-2xl p-6 w-[360px] shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Delete Opportunity</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{deleteTarget.title}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                This will permanently remove this opportunity. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="danger"
                  onClick={() => deleteMut.mutate(deleteTarget.id)}
                  disabled={deleteMut.isPending}>
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
