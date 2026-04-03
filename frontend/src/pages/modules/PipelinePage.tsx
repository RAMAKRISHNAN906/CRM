import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pipelineService,
  PipelineStage,
  DealCard,
  StageTransition,
} from '../../services/pipeline.service';
import { formatCurrency } from '../../utils/formatters';
import {
  Settings, Plus, Video, X, Save, Trash2,
  TrendingUp, BarChart2, Clock, AlertTriangle,
  ChevronRight, ArrowRight, CheckCircle2, XCircle,
  Timer, Target, Award, TrendingDown, GripVertical,
  Pencil, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDuration = (hours: number | null | undefined) => {
  if (!hours && hours !== 0) return '—';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
};

const PRESET_COLORS = [
  '#64748b','#3b82f6','#8b5cf6','#f59e0b','#f97316',
  '#06b6d4','#10b981','#22c55e','#ef4444','#ec4899',
];

// ─────────────────────────────────────────────────────────────────────────────
// Configure Pipeline Stages Modal — fully functional
// ─────────────────────────────────────────────────────────────────────────────
const StageSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages,
  });

  // Local editable copies
  const [editing, setEditing] = useState<Record<string, Partial<PipelineStage>>>({});
  const [newName, setNewName]     = useState('');
  const [newColor, setNewColor]   = useState('#3b82f6');
  const [newProb, setNewProb]     = useState('10');
  const [newExpDays, setNewExpDays] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const getEdit = (stage: PipelineStage) => ({ ...stage, ...editing[stage.id] });

  const patch = (id: string, field: string, value: any) =>
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PipelineStage> }) =>
      pipelineService.updateStage(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['pipeline-funnel'] });
      setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
      setSaving(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast.success('Stage saved');
    },
    onError: () => toast.error('Failed to save stage'),
  });

  const handleSave = (stage: PipelineStage) => {
    const changes = editing[stage.id];
    if (!changes) return;
    setSaving(prev => ({ ...prev, [stage.id]: true }));
    saveMut.mutate({ id: stage.id, data: changes });
  };

  const createMut = useMutation({
    mutationFn: () => pipelineService.createStage({
      name: newName,
      order: stages.length + 1,
      color: newColor,
      defaultProbability: parseInt(newProb) || 10,
      expectedDays: newExpDays ? parseInt(newExpDays) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      setNewName(''); setNewExpDays(''); setNewProb('10');
      toast.success('Stage added');
    },
    onError: () => toast.error('Failed to add stage'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => pipelineService.deleteStage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['pipeline-funnel'] });
      toast.success('Stage removed');
    },
    onError: () => toast.error('Failed to delete stage'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Configure Pipeline Stages</h2>
            <p className="text-xs text-gray-500 mt-0.5">Edit name, color, probability, expected days, and stage type</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-[32px_1fr_80px_80px_80px_80px_40px] gap-2 px-3 mb-2 flex-shrink-0">
          <span />
          <span className="text-xs text-gray-600 font-medium">Stage Name</span>
          <span className="text-xs text-gray-600 font-medium text-center">Prob %</span>
          <span className="text-xs text-gray-600 font-medium text-center">Exp Days</span>
          <span className="text-xs text-gray-600 font-medium text-center">Type</span>
          <span className="text-xs text-gray-600 font-medium text-center">Order</span>
          <span />
        </div>

        {/* Stages list */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 mb-5">
          {stages.map((stage, idx) => {
            const s = getEdit(stage);
            const isDirty = !!editing[stage.id];
            return (
              <div key={stage.id} className="relative">
                {/* Color picker popover */}
                {colorPickerFor === stage.id && (
                  <div className="absolute left-8 top-10 z-10 bg-surface-elevated border border-border rounded-xl p-3 shadow-2xl flex flex-wrap gap-2 w-48">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => { patch(stage.id, 'color', c); setColorPickerFor(null); }}
                        className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: s.color === c ? '#fff' : 'transparent' }} />
                    ))}
                    <input type="color" value={s.color || '#3b82f6'}
                      onChange={e => patch(stage.id, 'color', e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent" title="Custom color" />
                  </div>
                )}

                <div className={`grid grid-cols-[32px_1fr_80px_80px_80px_80px_40px] gap-2 items-center p-3 rounded-xl border transition-all ${
                  isDirty ? 'bg-accent-10 border-accent-30' : 'bg-surface-secondary border-border'
                }`}>
                  {/* Color swatch / drag handle */}
                  <button
                    onClick={() => setColorPickerFor(colorPickerFor === stage.id ? null : stage.id)}
                    className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-white/10 hover:border-white/40 transition-colors"
                    style={{ background: s.color }}
                    title="Change color"
                  />

                  {/* Name */}
                  <input
                    className="bg-transparent text-sm text-white outline-none min-w-0 border-b border-transparent focus:border-accent-30 pb-0.5 transition-colors"
                    value={s.name ?? stage.name}
                    onChange={e => patch(stage.id, 'name', e.target.value)}
                  />

                  {/* Probability % */}
                  <div className="flex items-center gap-0.5 justify-center">
                    <input
                      type="number" min={0} max={100}
                      value={s.defaultProbability ?? stage.defaultProbability}
                      onChange={e => patch(stage.id, 'defaultProbability', parseInt(e.target.value) || 0)}
                      className="w-10 bg-surface border border-border rounded-lg text-center text-xs text-white outline-none focus:border-accent py-1"
                    />
                    <span className="text-xs text-gray-600">%</span>
                  </div>

                  {/* Expected Days */}
                  <div className="flex items-center gap-0.5 justify-center">
                    <input
                      type="number" min={1}
                      value={s.expectedDays ?? stage.expectedDays ?? ''}
                      placeholder="—"
                      onChange={e => patch(stage.id, 'expectedDays', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-10 bg-surface border border-border rounded-lg text-center text-xs text-white outline-none focus:border-accent py-1"
                    />
                    <span className="text-xs text-gray-600">d</span>
                  </div>

                  {/* Type: Won / Lost / Normal */}
                  <div className="flex items-center gap-1 justify-center">
                    <button
                      onClick={() => { patch(stage.id, 'isWon', !s.isWon); patch(stage.id, 'isLost', false); }}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors font-medium ${
                        s.isWon ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-600 hover:text-green-400 border border-transparent'
                      }`} title="Won stage">W</button>
                    <button
                      onClick={() => { patch(stage.id, 'isLost', !s.isLost); patch(stage.id, 'isWon', false); }}
                      className={`text-xs px-1.5 py-0.5 rounded transition-colors font-medium ${
                        s.isLost ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-600 hover:text-red-400 border border-transparent'
                      }`} title="Lost stage">L</button>
                  </div>

                  {/* Order badge */}
                  <span className="text-xs text-gray-600 text-center">{idx + 1}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {isDirty && (
                      <button
                        onClick={() => handleSave(stage)}
                        disabled={saving[stage.id]}
                        className="p-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        title="Save changes"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm(`Delete "${stage.name}"?`)) deleteMut.mutate(stage.id); }}
                      className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete stage"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Stage */}
        <div className="border-t border-border pt-4 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-3 font-medium">Add New Stage</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                style={{ background: c, borderColor: newColor === c ? '#fff' : 'transparent' }} />
            ))}
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent" title="Custom color" />
          </div>
          <div className="flex gap-2">
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Stage name"
              className="flex-1 bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); }}
            />
            <div className="flex items-center gap-1">
              <input type="number" value={newProb} onChange={e => setNewProb(e.target.value)}
                placeholder="%" title="Probability %"
                className="w-14 bg-surface-secondary border border-border rounded-xl px-2 py-2 text-sm text-white text-center outline-none focus:border-accent" />
              <span className="text-xs text-gray-600">%</span>
            </div>
            <div className="flex items-center gap-1">
              <input type="number" value={newExpDays} onChange={e => setNewExpDays(e.target.value)}
                placeholder="days" title="Expected days"
                className="w-16 bg-surface-secondary border border-border rounded-xl px-2 py-2 text-sm text-white text-center outline-none focus:border-accent" />
              <span className="text-xs text-gray-600">d</span>
            </div>
            <button
              onClick={() => newName.trim() && createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
              className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-40 flex items-center gap-1 hover:bg-accent/90 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-2">Click the color dot to change color · Click W/L to mark Won/Lost · Click ✓ to save edits</p>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Deal Detail Panel (slide-over)
// ─────────────────────────────────────────────────────────────────────────────
const DealDetailPanel: React.FC<{ deal: DealCard; stages: PipelineStage[]; onClose: () => void }> = ({ deal, stages, onClose }) => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'demo'>('timeline');

  const { data: timeline = [] } = useQuery({
    queryKey: ['deal-timeline', deal.id],
    queryFn: () => pipelineService.getDealTimeline(deal.id),
  });

  const { data: demo } = useQuery({
    queryKey: ['demo', deal.id],
    queryFn: () => pipelineService.getDemoDetail(deal.id),
  });

  const [demoForm, setDemoForm] = useState({
    demoDate: demo?.demoDate?.slice(0, 10) ?? '',
    meetingLink: demo?.meetingLink ?? '',
    demoStatus: (demo?.demoStatus ?? 'Scheduled') as 'Scheduled' | 'Completed' | 'Cancelled',
    demoSummary: demo?.demoSummary ?? '',
    nextAction: demo?.nextAction ?? '',
  });

  const moveMut = useMutation({
    mutationFn: (stageId: string) => pipelineService.moveDeal(deal.id, stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['deal-timeline', deal.id] });
      qc.invalidateQueries({ queryKey: ['pipeline-funnel'] });
      toast.success('Deal moved');
    },
  });

  const saveDemoMut = useMutation({
    mutationFn: () => pipelineService.upsertDemoDetail(deal.id, demoForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demo', deal.id] });
      toast.success('Demo saved');
    },
  });

  const currentStage = stages.find(s => s.id === deal.stageId);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-[420px] h-full bg-surface-elevated border-l border-border shadow-2xl overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="font-bold text-white text-base leading-tight">{deal.title}</h2>
            {deal.contact && (
              <p className="text-sm text-gray-400 mt-0.5">
                {deal.contact.firstName} {deal.contact.lastName}
                {deal.contact.company && <span className="text-gray-600"> · {deal.contact.company}</span>}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-green-400 font-semibold">{formatCurrency(deal.value)}</span>
              <span className="text-xs text-gray-500">{deal.probability}% probability</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white mt-0.5"><X size={18} /></button>
        </div>

        {/* Move to stage */}
        <div className="p-5 border-b border-border">
          <p className="text-xs text-gray-500 mb-2">Move to stage</p>
          <div className="flex flex-wrap gap-1.5">
            {stages.map(stage => (
              <button key={stage.id}
                onClick={() => stage.id !== deal.stageId && moveMut.mutate(stage.id)}
                disabled={stage.id === deal.stageId || moveMut.isPending}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  stage.id === deal.stageId
                    ? 'border-transparent text-white'
                    : 'border-border text-gray-400 hover:text-white hover:border-border-strong'
                }`}
                style={stage.id === deal.stageId ? { background: `${stage.color}30`, borderColor: stage.color, color: stage.color } : {}}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                {stage.name}
              </button>
            ))}
          </div>
          {deal.stageAgeDays != null && (
            <div className={`flex items-center gap-1.5 mt-3 text-xs px-2.5 py-1.5 rounded-lg w-fit ${
              deal.isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-surface text-gray-400'
            }`}>
              {deal.isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
              <span>{deal.stageAgeDays}d in {currentStage?.name}</span>
              {currentStage?.expectedDays && <span className="text-gray-600">/ {currentStage.expectedDays}d target</span>}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['timeline', 'demo'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                activeTab === tab ? 'text-white border-b-2 border-accent' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {tab === 'timeline' ? 'Stage History' : 'Demo Details'}
            </button>
          ))}
        </div>

        {/* Timeline tab */}
        {activeTab === 'timeline' && (
          <div className="p-5 flex-1">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No stage history yet.</div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {timeline.map((t: StageTransition, idx) => (
                    <div key={t.id} className="flex gap-4 items-start relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                        style={{ background: `${t.toStage.color}20`, borderColor: t.toStage.color }}>
                        {t.toStage.isWon ? <CheckCircle2 size={14} color={t.toStage.color} />
                          : t.toStage.isLost ? <XCircle size={14} color={t.toStage.color} />
                          : <ChevronRight size={14} color={t.toStage.color} />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2">
                          {t.fromStage && (
                            <>
                              <span className="text-xs text-gray-500">{t.fromStage.name}</span>
                              <ArrowRight size={10} className="text-gray-700 flex-shrink-0" />
                            </>
                          )}
                          <span className="text-xs font-semibold" style={{ color: t.toStage.color }}>{t.toStage.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-600">
                            {new Date(t.enteredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                          {t.durationHours != null && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Timer size={9} /> {fmtDuration(t.durationHours)} in stage
                            </span>
                          )}
                          {!t.exitedAt && idx === timeline.length - 1 && (
                            <span className="text-xs text-accent-light">● current</span>
                          )}
                        </div>
                        {t.changedBy && <p className="text-xs text-gray-700 mt-0.5">by {t.changedBy.name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo tab */}
        {activeTab === 'demo' && (
          <div className="p-5 space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Demo Date</label>
                <input type="date" value={demoForm.demoDate}
                  onChange={e => setDemoForm({ ...demoForm, demoDate: e.target.value })}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select value={demoForm.demoStatus}
                  onChange={e => setDemoForm({ ...demoForm, demoStatus: e.target.value as any })}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 block"><Video size={11} /> Meeting Link</label>
              <input value={demoForm.meetingLink} onChange={e => setDemoForm({ ...demoForm, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Demo Summary</label>
              <textarea value={demoForm.demoSummary} onChange={e => setDemoForm({ ...demoForm, demoSummary: e.target.value })}
                rows={3} placeholder="What was discussed..."
                className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Next Action</label>
              <input value={demoForm.nextAction} onChange={e => setDemoForm({ ...demoForm, nextAction: e.target.value })}
                placeholder="Follow up with pricing..."
                className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent" />
            </div>
            <button onClick={() => saveDemoMut.mutate()} disabled={saveDemoMut.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-60 hover:bg-accent/90 transition-colors">
              <Save size={14} /> {saveDemoMut.isPending ? 'Saving...' : 'Save Demo Details'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Funnel View (with editable completion % per stage)
// ─────────────────────────────────────────────────────────────────────────────
const FunnelView: React.FC<{ onDealClick?: (deal: DealCard) => void; stages: PipelineStage[] }> = ({ onDealClick, stages }) => {
  const qc = useQueryClient();
  const { data: funnel = [], isLoading } = useQuery({
    queryKey: ['pipeline-funnel'],
    queryFn: pipelineService.getFunnel,
  });
  const { data: analytics } = useQuery({
    queryKey: ['pipeline-analytics'],
    queryFn: pipelineService.getAnalytics,
  });

  // Local completion % overrides per stage (separate from defaultProbability)
  const [completionPct, setCompletionPct] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('pipeline_completion_pct');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingPct, setEditingPct] = useState<string | null>(null);

  const savePct = (stageId: string, val: number) => {
    const next = { ...completionPct, [stageId]: Math.min(100, Math.max(0, val)) };
    setCompletionPct(next);
    localStorage.setItem('pipeline_completion_pct', JSON.stringify(next));
    setEditingPct(null);
  };

  const updateStageMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PipelineStage> }) =>
      pipelineService.updateStage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline-stages'] });
      qc.invalidateQueries({ queryKey: ['pipeline-funnel'] });
    },
  });

  const maxCount = Math.max(...funnel.map(r => r.count), 1);
  const maxValue = Math.max(...funnel.map(r => r.totalValue), 1);

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-surface-secondary border border-border animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Deals', value: analytics.totalDeals, icon: <BarChart2 size={16} />, color: '#3b82f6' },
            { label: 'Pipeline Value', value: formatCurrency(analytics.totalValue), icon: <TrendingUp size={16} />, color: '#10b981' },
            { label: 'Win Rate', value: `${analytics.winRate}%`, icon: <Award size={16} />, color: '#f59e0b' },
            { label: 'Avg Cycle', value: analytics.avgCycleDays ? `${analytics.avgCycleDays}d` : '—', icon: <Timer size={16} />, color: '#8b5cf6' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-surface-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color: kpi.color }}>
                {kpi.icon}
                <span className="text-xs text-gray-500">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Funnel */}
      <div className="bg-surface-secondary border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">Pipeline Funnel</h3>
          <span className="text-xs text-gray-600">Click % to set stage completion</span>
        </div>

        {funnel.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No pipeline data yet.</p>
        ) : (
          <div className="space-y-3">
            {funnel.map((row, idx) => {
              const stage = stages.find(s => s.id === row.stage.id);
              const barPct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
              const valuePct = maxValue > 0 ? (row.totalValue / maxValue) * 100 : 0;
              const pct = completionPct[row.stage.id] ?? row.stage.defaultProbability ?? 0;
              const isEditingThis = editingPct === row.stage.id;

              return (
                <div key={row.stage.id}>
                  {/* Stage row */}
                  <div className="flex items-center gap-3">
                    {/* Stage name */}
                    <div className="flex items-center gap-2 w-32 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.stage.color }} />
                      <span className="text-xs font-medium text-gray-300 truncate">{row.stage.name}</span>
                      {row.stage.isWon && <CheckCircle2 size={10} className="text-green-400 flex-shrink-0" />}
                      {row.stage.isLost && <XCircle size={10} className="text-red-400 flex-shrink-0" />}
                    </div>

                    {/* Funnel bar */}
                    <div className="flex-1 flex flex-col gap-1">
                      {/* Deal count bar */}
                      <div className="h-6 bg-surface rounded-lg overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                          transition={{ delay: idx * 0.06, duration: 0.55, ease: 'easeOut' }}
                          className="h-full rounded-lg flex items-center justify-end pr-2"
                          style={{ background: `${row.stage.color}35`, borderLeft: `3px solid ${row.stage.color}` }}
                        >
                          {barPct > 15 && (
                            <span className="text-xs font-semibold" style={{ color: row.stage.color }}>{row.count}</span>
                          )}
                        </motion.div>
                      </div>

                      {/* Value bar */}
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${valuePct}%` }}
                          transition={{ delay: idx * 0.06 + 0.1, duration: 0.55, ease: 'easeOut' }}
                          className="h-full rounded-full opacity-50"
                          style={{ background: row.stage.color }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 flex-shrink-0 w-52 justify-end text-right">
                      <span className="text-xs text-gray-400 w-6 text-center font-medium">{row.count}</span>
                      <span className="text-xs text-gray-500 w-24 text-right">{formatCurrency(row.totalValue)}</span>

                      {/* Editable completion % */}
                      <div className="w-16 flex items-center justify-end">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="number" min={0} max={100}
                              defaultValue={pct}
                              onBlur={e => savePct(row.stage.id, parseInt(e.target.value) || 0)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') savePct(row.stage.id, parseInt((e.target as HTMLInputElement).value) || 0);
                                if (e.key === 'Escape') setEditingPct(null);
                              }}
                              className="w-10 bg-surface border border-accent rounded px-1 py-0.5 text-xs text-white text-center outline-none"
                            />
                            <span className="text-xs text-gray-600">%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingPct(row.stage.id)}
                            className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-lg border transition-colors group hover:border-accent/50 ${
                              pct >= 70 ? 'text-green-400 border-green-500/20 bg-green-500/5'
                              : pct >= 40 ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                              : 'text-red-400 border-red-500/20 bg-red-500/5'
                            }`}
                            title="Click to edit completion %"
                          >
                            <Pencil size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            {pct}%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Completion progress bar */}
                  <div className="ml-[136px] mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full rounded-full"
                        style={{ background: pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }}
                      />
                    </div>
                    {row.avgDurationHours != null && (
                      <span className="text-xs text-gray-700 flex items-center gap-1 flex-shrink-0">
                        <Timer size={9} /> {fmtDuration(row.avgDurationHours)}
                        {row.stage.expectedDays && <span className="text-gray-800">/ {row.stage.expectedDays}d</span>}
                      </span>
                    )}
                    {row.conversionRate !== null && (
                      <span className={`text-xs flex-shrink-0 ${
                        row.conversionRate >= 50 ? 'text-green-500' : row.conversionRate >= 25 ? 'text-yellow-500' : 'text-red-500'
                      }`}>↑{row.conversionRate}% conv.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-3 border-t border-border text-xs text-gray-600">
          <span>Top bar = deal count · Thin bar = value proportion · % = stage completion</span>
          <span>conv. = from previous stage</span>
        </div>
      </div>

      {/* Stage duration analysis */}
      {analytics && analytics.stageStats.length > 0 && (
        <div className="bg-surface-secondary border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Stage Duration Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-600 border-b border-border">
                  <th className="text-left pb-2">Stage</th>
                  <th className="text-center pb-2">Transitions</th>
                  <th className="text-center pb-2">Avg Duration</th>
                  <th className="text-center pb-2">Target</th>
                  <th className="text-center pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.stageStats.map(s => {
                  const avgDays = s.avgDurationHours / 24;
                  const isSlower = s.expectedDays && avgDays > s.expectedDays;
                  return (
                    <tr key={s.stageId} className="text-xs">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: s.stageColor }} />
                          <span className="text-gray-300">{s.stageName}</span>
                          {s.isWon && <span className="text-green-400 text-xs">Won</span>}
                          {s.isLost && <span className="text-red-400 text-xs">Lost</span>}
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-gray-400">{s.transitionCount}</td>
                      <td className="py-2.5 text-center text-gray-300">{fmtDuration(s.avgDurationHours || null)}</td>
                      <td className="py-2.5 text-center text-gray-500">{s.expectedDays ? `${s.expectedDays}d` : '—'}</td>
                      <td className="py-2.5 text-center">
                        {s.expectedDays
                          ? isSlower
                            ? <span className="flex items-center justify-center gap-1 text-red-400"><TrendingDown size={11} /> Slow</span>
                            : <span className="flex items-center justify-center gap-1 text-green-400"><CheckCircle2 size={11} /> On track</span>
                          : <span className="text-gray-700">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline Page
// ─────────────────────────────────────────────────────────────────────────────
export const PipelinePage: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealCard | null>(null);

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages,
  });

  const { data: funnel = [] } = useQuery({
    queryKey: ['pipeline-funnel'],
    queryFn: pipelineService.getFunnel,
  });

  const totalDeals = funnel.reduce((s: number, r: any) => s + r.count, 0);
  const totalValue = funnel.reduce((s: number, r: any) => s + r.totalValue, 0);
  const overdueCount = funnel.reduce((s: number, r: any) => s + (r.overdueCount ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Sales Pipeline</h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span>{totalDeals} deals</span>
            <span>{formatCurrency(totalValue)} pipeline</span>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={11} /> {overdueCount} overdue
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface-secondary text-sm text-gray-400 hover:text-white hover:border-border-strong transition-all"
        >
          <Settings size={14} /> Configure Stages
        </button>
      </motion.div>

      {/* Funnel (only view) */}
      <FunnelView stages={stages} onDealClick={setSelectedDeal} />

      {/* Modals */}
      <AnimatePresence>
        {showSettings && <StageSettingsModal onClose={() => setShowSettings(false)} />}
        {selectedDeal && (
          <DealDetailPanel deal={selectedDeal} stages={stages} onClose={() => setSelectedDeal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
