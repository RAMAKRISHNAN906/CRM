import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Plus, Trash2, Pencil, X, Search, Globe, Phone,
  TrendingUp, TrendingDown, StickyNote, ChevronDown, ChevronUp,
  BarChart2, Shield, AlertTriangle, Star,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────
interface Competitor {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
  dealId?: string;
  deal?: { title: string };
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseList = (s?: string): string[] =>
  s ? s.split('\n').map(l => l.trim()).filter(Boolean) : [];

const strengthScore = (c: Competitor) => parseList(c.strengths).length;
const weaknessScore = (c: Competitor) => parseList(c.weaknesses).length;

// Gauge: ratio of strengths vs weaknesses (0–100)
const threatLevel = (c: Competitor): number => {
  const s = parseList(c.strengths).length;
  const w = parseList(c.weaknesses).length;
  if (s + w === 0) return 50;
  return Math.round((s / (s + w)) * 100);
};

const threatColor = (lvl: number) =>
  lvl >= 70 ? 'text-red-400' : lvl >= 45 ? 'text-amber-400' : 'text-green-400';

const threatBg = (lvl: number) =>
  lvl >= 70 ? 'bg-red-500' : lvl >= 45 ? 'bg-amber-500' : 'bg-green-500';

// ── Form Modal ────────────────────────────────────────────────────────────────
const CompetitorForm: React.FC<{
  initial?: Competitor | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}> = ({ initial, onClose, onSave, isPending }) => {
  const [form, setForm] = useState({
    name:       initial?.name       ?? '',
    phone:      initial?.phone      ?? '',
    website:    initial?.website    ?? '',
    strengths:  initial?.strengths  ?? '',
    weaknesses: initial?.weaknesses ?? '',
    notes:      initial?.notes      ?? '',
  });
  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <Modal isOpen onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add Competitor'}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/50 mb-1 block font-medium">Competitor Name *</label>
          <Input value={form.name} onChange={f('name')} placeholder="e.g. Salesforce, HubSpot" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block font-medium flex items-center gap-1"><Phone size={10} /> Phone</label>
            <Input value={form.phone} onChange={f('phone')} placeholder="+91 9876543210" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block font-medium flex items-center gap-1"><Globe size={10} /> Website</label>
            <Input value={form.website} onChange={f('website')} placeholder="https://example.com" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block font-medium flex items-center gap-1">
            <TrendingUp size={10} className="text-green-400" /> Strengths
            <span className="text-gray-700 ml-1">(one per line)</span>
          </label>
          <textarea value={form.strengths} onChange={f('strengths')}
            rows={4} placeholder={"Strong brand recognition\nLarge customer base\nRobust integrations"}
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-green-500/50 resize-none font-mono" />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block font-medium flex items-center gap-1">
            <TrendingDown size={10} className="text-red-400" /> Weaknesses
            <span className="text-gray-700 ml-1">(one per line)</span>
          </label>
          <textarea value={form.weaknesses} onChange={f('weaknesses')}
            rows={4} placeholder={"Expensive pricing\nPoor customer support\nSteep learning curve"}
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50 resize-none font-mono" />
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block font-medium flex items-center gap-1"><StickyNote size={10} /> Notes</label>
          <textarea value={form.notes} onChange={f('notes')}
            rows={2} placeholder="Additional observations, market positioning..."
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none" />
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={isPending || !form.name.trim()}>
            {isPending ? 'Saving...' : initial ? 'Save Changes' : 'Add Competitor'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Competitor Card ───────────────────────────────────────────────────────────
const CompetitorCard: React.FC<{
  competitor: Competitor;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ competitor: c, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const strengths  = parseList(c.strengths);
  const weaknesses = parseList(c.weaknesses);
  const threat     = threatLevel(c);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="overflow-hidden border-white/8 hover:border-white/15 transition-all">
        {/* Threat level top bar */}
        <div className="h-1 w-full bg-white/5">
          <motion.div
            animate={{ width: `${threat}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full ${threatBg(threat)}`}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base">{c.name[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">{c.name}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.website && (
                    <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition-colors">
                      <Globe size={10} /> {c.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {c.phone && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Phone size={10} /> {c.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Threat level badge */}
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                threat >= 70 ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : threat >= 45 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'bg-green-500/15 text-green-400 border border-green-500/25'
              }`}>
                {threat >= 70 ? <AlertTriangle size={10} /> : <Shield size={10} />}
                {threat >= 70 ? 'High threat' : threat >= 45 ? 'Medium' : 'Low threat'}
              </div>
              <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) onDelete(); }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp size={12} />
                <span className="font-semibold">{strengths.length}</span>
              </div>
              <span className="text-gray-600">strengths</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 text-red-400">
                <TrendingDown size={12} />
                <span className="font-semibold">{weaknesses.length}</span>
              </div>
              <span className="text-gray-600">weaknesses</span>
            </div>
            {c.deal && (
              <span className="text-xs text-gray-600 ml-auto truncate">Deal: {c.deal.title}</span>
            )}
          </div>

          {/* Strength vs Weakness visual gauge */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="mt-3">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 gap-px">
                <motion.div animate={{ flex: strengths.length }} transition={{ duration: 0.6 }}
                  className="bg-green-500/60 rounded-l-full" />
                <motion.div animate={{ flex: weaknesses.length }} transition={{ duration: 0.6 }}
                  className="bg-red-500/60 rounded-r-full" />
              </div>
              <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                <span className="text-green-600">Strengths</span>
                <span className="text-red-600">Weaknesses</span>
              </div>
            </div>
          )}

          {/* Expand button */}
          {(strengths.length > 0 || weaknesses.length > 0 || c.notes) && (
            <button onClick={() => setExpanded(p => !p)}
              className="flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full justify-center py-1 rounded-lg hover:bg-white/5">
              {expanded ? <><ChevronUp size={12} /> Hide details</> : <><ChevronDown size={12} /> View details</>}
            </button>
          )}

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Strengths */}
                  {strengths.length > 0 && (
                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                      <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-2">
                        <TrendingUp size={11} /> Strengths
                      </p>
                      <ul className="space-y-1.5">
                        {strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {weaknesses.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                      <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-2">
                        <TrendingDown size={11} /> Weaknesses
                      </p>
                      <ul className="space-y-1.5">
                        {weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {c.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-white/3 border border-border">
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                      <StickyNote size={10} /> Notes
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">{c.notes}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

// ── Comparison Table ──────────────────────────────────────────────────────────
const ComparisonView: React.FC<{ competitors: Competitor[] }> = ({ competitors }) => {
  if (competitors.length === 0) return null;

  const allStrengths  = [...new Set(competitors.flatMap(c => parseList(c.strengths)))];
  const allWeaknesses = [...new Set(competitors.flatMap(c => parseList(c.weaknesses)))];

  return (
    <div className="bg-surface-secondary border border-border rounded-2xl p-5 overflow-x-auto">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart2 size={14} className="text-violet-400" /> Competitor Comparison
      </h3>
      <table className="w-full text-xs min-w-[500px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pb-3 text-gray-500 font-medium w-40">Metric</th>
            {competitors.map(c => (
              <th key={c.id} className="text-center pb-3 px-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-bold text-white text-xs">
                    {c.name[0]}
                  </div>
                  <span className="text-gray-300 font-medium truncate max-w-[80px]">{c.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          <tr>
            <td className="py-2.5 text-gray-500">Threat Level</td>
            {competitors.map(c => {
              const t = threatLevel(c);
              return (
                <td key={c.id} className={`py-2.5 text-center font-semibold ${threatColor(t)}`}>
                  {t}%
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="py-2.5 text-gray-500 flex items-center gap-1"><TrendingUp size={10} className="text-green-400" /> Strengths</td>
            {competitors.map(c => (
              <td key={c.id} className="py-2.5 text-center text-green-400 font-semibold">{parseList(c.strengths).length}</td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 text-gray-500"><TrendingDown size={10} className="text-red-400 inline mr-1" />Weaknesses</td>
            {competitors.map(c => (
              <td key={c.id} className="py-2.5 text-center text-red-400 font-semibold">{parseList(c.weaknesses).length}</td>
            ))}
          </tr>
          <tr>
            <td className="py-2.5 text-gray-500"><Globe size={10} className="inline mr-1" />Website</td>
            {competitors.map(c => (
              <td key={c.id} className="py-2.5 text-center">
                {c.website
                  ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">↗</a>
                  : <span className="text-gray-700">—</span>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const CompetitorsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Competitor | null>(null);
  const [view, setView]           = useState<'cards' | 'compare'>('cards');
  const [sortBy, setSortBy]       = useState<'name' | 'threat' | 'strengths' | 'weaknesses'>('name');

  const { data, isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => { const r = await api.get('/competitors'); return r.data; },
  });

  const competitors: Competitor[] = (data?.data ?? []).filter((c: Competitor) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...competitors].sort((a, b) => {
    if (sortBy === 'threat')     return threatLevel(b) - threatLevel(a);
    if (sortBy === 'strengths')  return strengthScore(b) - strengthScore(a);
    if (sortBy === 'weaknesses') return weaknessScore(b) - weaknessScore(a);
    return a.name.localeCompare(b.name);
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/competitors', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); setShowForm(false); toast.success('Competitor added'); },
    onError: () => toast.error('Failed to add competitor'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/competitors/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); setEditing(null); toast.success('Competitor updated'); },
    onError: () => toast.error('Failed to update competitor'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/competitors/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); toast.success('Competitor deleted'); },
    onError: () => toast.error('Failed to delete competitor'),
  });

  // Summary stats
  const avgThreat = competitors.length
    ? Math.round(competitors.reduce((s, c) => s + threatLevel(c), 0) / competitors.length) : 0;
  const highThreat = competitors.filter(c => threatLevel(c) >= 70).length;
  const totalStrengths  = competitors.reduce((s, c) => s + parseList(c.strengths).length, 0);
  const totalWeaknesses = competitors.reduce((s, c) => s + parseList(c.weaknesses).length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Swords size={20} className="text-violet-400" /> Competitor Intelligence
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Track competitor strengths, weaknesses and market positioning</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> Add Competitor
        </Button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tracked',  value: competitors.length,  icon: <Swords size={16} />,      color: '#7c3aed' },
          { label: 'High Threat',    value: highThreat,           icon: <AlertTriangle size={16} />, color: '#ef4444' },
          { label: 'Avg Threat',     value: `${avgThreat}%`,      icon: <BarChart2 size={16} />,   color: '#f59e0b' },
          { label: 'Known Weaknesses', value: totalWeaknesses,    icon: <Shield size={16} />,      color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="bg-surface-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>
              {s.icon}
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search competitors..."
            className="w-full bg-surface-secondary border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent" />
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
          <option value="name">Sort: Name</option>
          <option value="threat">Sort: Threat Level</option>
          <option value="strengths">Sort: Most Strengths</option>
          <option value="weaknesses">Sort: Most Weaknesses</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface-secondary border border-border rounded-xl">
          {(['cards', 'compare'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                view === v ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {v === 'cards' ? 'Cards' : 'Compare'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Swords size={32} className="text-violet-400" />
          </div>
          <p className="text-gray-400 text-sm">No competitors tracked yet.</p>
          <Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1.5" /> Add First Competitor</Button>
        </div>
      ) : view === 'compare' ? (
        <ComparisonView competitors={sorted} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {sorted.map(c => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                onEdit={() => setEditing(c)}
                onDelete={() => deleteMut.mutate(c.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CompetitorForm
          onClose={() => setShowForm(false)}
          onSave={data => createMut.mutate(data)}
          isPending={createMut.isPending}
        />
      )}
      {editing && (
        <CompetitorForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={data => updateMut.mutate({ id: editing.id, data })}
          isPending={updateMut.isPending}
        />
      )}
    </div>
  );
};
