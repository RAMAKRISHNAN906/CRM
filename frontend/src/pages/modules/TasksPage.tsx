import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, Reorder, useDragControls } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '../../services/tasks.service';
import { Task } from '../../types';
import {
  CheckCircle2, Circle, Trash2, Plus, ChevronDown, ChevronUp,
  AlertTriangle, ArrowUp, Minus, Zap, Calendar, FileText,
  RotateCcw, Sparkles, GripVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY = {
  URGENT: { label: 'Urgent', color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400', icon: <Zap size={11} /> },
  HIGH:   { label: 'High',   color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400', icon: <ArrowUp size={11} /> },
  MEDIUM: { label: 'Medium', color: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-400', icon: <Minus size={11} /> },
  LOW:    { label: 'Low',    color: '#6b7280', bg: 'bg-gray-500/15', text: 'text-gray-400', icon: <ChevronDown size={11} /> },
} as const;

// ── Circular progress ring ─────────────────────────────────────────────────────
const CircularProgress: React.FC<{ pct: number; size?: number; stroke?: number }> = ({
  pct, size = 120, stroke = 8,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const dashOffset = useTransform(spring, (v) => circ - (v / 100) * circ);
  useEffect(() => { spring.set(pct); }, [pct, spring]);
  const color = pct === 100 ? '#22c55e' : pct >= 60 ? '#6366f1' : pct >= 30 ? '#f59e0b' : '#6366f1';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e2e" strokeWidth={stroke} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ}
          style={{ strokeDashoffset: dashOffset }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span key={pct} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold text-white">{pct}%</motion.span>
        <span className="text-[10px] text-gray-500 mt-0.5">done</span>
      </div>
    </div>
  );
};

// ── Confetti ───────────────────────────────────────────────────────────────────
function fireConfetti() {
  const end = Date.now() + 2500;
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors, startVelocity: 35 });
}

// ── All-done banner ────────────────────────────────────────────────────────────
const AllDoneBanner: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 20 }}
    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-8 text-center"
  >
    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent"
      animate={{ x: ['-100%', '200%'] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }} />
    <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, delay: 0.2 }} className="text-5xl mb-3">🎉</motion.div>
    <h3 className="text-xl font-bold text-green-400 mb-1">All Tasks Completed!</h3>
    <p className="text-sm text-gray-400">Outstanding work — your sprint is done. 🚀</p>
    <div className="flex items-center justify-center gap-2 mt-4">
      {['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'].map((c, i) => (
        <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: c }}
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }} />
      ))}
    </div>
  </motion.div>
);

// ── Drag handle ────────────────────────────────────────────────────────────────
const DragHandle: React.FC<{ controls: ReturnType<typeof useDragControls> }> = ({ controls }) => (
  <motion.div
    onPointerDown={(e) => controls.start(e)}
    whileHover={{ scale: 1.2, color: '#6366f1' }}
    whileTap={{ scale: 0.95 }}
    className="cursor-grab active:cursor-grabbing flex-shrink-0 text-gray-700 hover:text-accent p-1 rounded-lg hover:bg-accent/10 transition-colors touch-none select-none"
    title="Drag to reorder"
  >
    <GripVertical size={16} />
  </motion.div>
);

// ── Task card (Reorder.Item) ───────────────────────────────────────────────────
const TaskCard: React.FC<{
  task: Task;
  onComplete: () => void;
  onIncomplete: () => void;
  onDelete: () => void;
  updating: boolean;
}> = ({ task, onComplete, onIncomplete, onDelete, updating }) => {
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  const done = task.status === 'COMPLETED';
  const pri = PRIORITY[(task.priority as keyof typeof PRIORITY) ?? 'MEDIUM'];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !done;

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      as="div"
      className={`rounded-xl border transition-colors overflow-hidden select-none
        ${done
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-border bg-surface-elevated hover:border-border-strong'}`}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        zIndex: 50,
        cursor: 'grabbing',
      }}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Main row */}
      <div className="flex items-start gap-2 p-4">
        {/* Grip handle */}
        <DragHandle controls={controls} />

        {/* Status circle */}
        <button onClick={done ? onIncomplete : onComplete} disabled={updating}
          className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 active:scale-95">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <CheckCircle2 size={22} className="text-green-400" />
              </motion.div>
            ) : (
              <motion.div key="todo" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Circle size={22} className="text-gray-600" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-gray-500' : 'text-white'}`}>
              {task.title}
            </p>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pri.bg} ${pri.text}`}>
              {pri.icon} {pri.label}
            </span>
          </div>

          {task.description && !expanded && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                <Calendar size={10} />
                {isOverdue && <AlertTriangle size={10} />}
                {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.description && (
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-300 transition-colors">
                <FileText size={10} />
                {expanded ? 'less' : 'more'}
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
          </div>

          <AnimatePresence>
            {expanded && task.description && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="text-xs text-gray-400 mt-2 leading-relaxed border-t border-border/50 pt-2 overflow-hidden">
                {task.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Delete */}
        <button onClick={onDelete}
          className="mt-0.5 flex-shrink-0 text-gray-700 hover:text-red-400 transition-colors p-0.5">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border/50">
        {!done ? (
          <motion.button onClick={onComplete} disabled={updating}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-40">
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.4 }}>
              <CheckCircle2 size={13} />
            </motion.div>
            Mark as Complete
          </motion.button>
        ) : (
          <motion.button onClick={onIncomplete} disabled={updating}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40">
            <RotateCcw size={13} />
            Mark as Incomplete
          </motion.button>
        )}
      </div>
    </Reorder.Item>
  );
};

// ── Quick-add form ─────────────────────────────────────────────────────────────
const DURATION_OPTS = [
  { label: '1 day',    days: 1 },
  { label: '3 days',   days: 3 },
  { label: '1 week',   days: 7 },
  { label: '2 weeks',  days: 14 },
  { label: '1 month',  days: 30 },
];

const QuickAddForm: React.FC<{
  onAdd: (title: string, description: string, priority: string, dueDate?: string) => void;
  loading: boolean;
}> = ({ onAdd, loading }) => {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [priority, setPriority] = useState<keyof typeof PRIORITY>('MEDIUM');
  const [dueDate, setDueDate]   = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // When a duration shortcut is clicked, compute due date from today
  const applyDuration = (days: number) => {
    setDuration(days);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  };

  // When user manually picks a date, clear duration shortcut highlight
  const handleDateChange = (val: string) => {
    setDueDate(val);
    setDuration(null);
  };

  const submit = () => {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    onAdd(title.trim(), desc.trim(), priority, dueDate || undefined);
    setTitle(''); setDesc(''); setDueDate(''); setDuration(null);
  };

  // Days remaining label
  const daysLeft = dueDate
    ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
    : null;

  const fieldCls = 'w-full bg-[#0d0d12] border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accent placeholder-gray-600 transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <span className="text-sm font-semibold text-white">New Task</span>
      </div>

      {/* Title */}
      <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
        placeholder="Task title... (e.g. Fix login bug, Deploy to staging)"
        className={fieldCls} />

      {/* Description */}
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional) — steps, acceptance criteria, notes..."
        rows={2} className={`${fieldCls} resize-none`} />

      {/* Due date + duration row */}
      <div className="p-3 rounded-xl bg-[#0d0d12] border border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500 flex items-center gap-1.5">
            <Calendar size={11} /> End Date &amp; Duration
          </label>
          {daysLeft !== null && (
            <motion.span
              key={daysLeft}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                daysLeft < 0  ? 'bg-red-500/20 text-red-400' :
                daysLeft <= 2 ? 'bg-orange-500/20 text-orange-400' :
                daysLeft <= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
              }`}>
              {daysLeft < 0
                ? `${Math.abs(daysLeft)}d overdue`
                : daysLeft === 0 ? 'Due today'
                : daysLeft === 1 ? 'Due tomorrow'
                : `${daysLeft} days left`}
            </motion.span>
          )}
        </div>

        {/* Date picker */}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => handleDateChange(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className={fieldCls}
        />

        {/* Duration quick-pick */}
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTS.map((opt) => (
            <button key={opt.days} onClick={() => applyDuration(opt.days)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border
                ${duration === opt.days
                  ? 'bg-accent/20 text-accent border-accent/50 scale-105'
                  : 'border-border text-gray-500 hover:text-gray-300 hover:border-border-strong'}`}>
              {opt.label}
            </button>
          ))}
          {dueDate && (
            <button onClick={() => { setDueDate(''); setDuration(null); }}
              className="px-2 py-1 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Priority + submit row */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {(Object.keys(PRIORITY) as Array<keyof typeof PRIORITY>).map((p) => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${priority === p
                  ? `${PRIORITY[p].bg} ${PRIORITY[p].text} border-current scale-105`
                  : 'border-border text-gray-500 hover:text-gray-300 hover:border-border-strong'}`}>
              {PRIORITY[p].icon} {PRIORITY[p].label}
            </button>
          ))}
        </div>
        <motion.button onClick={submit} disabled={!title.trim() || loading}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="ml-auto flex items-center gap-2 px-5 py-2 bg-accent text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-accent/80 transition-colors">
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><Circle size={14} /></motion.div>
            : <Plus size={15} />}
          Add Task
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Persist order to localStorage ─────────────────────────────────────────────
const ORDER_KEY = 'task_order_v1';
function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]'); } catch { return []; }
}
function saveOrder(ids: string[]) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch {}
}

function applyOrder(tasks: Task[], order: string[]): Task[] {
  // Sort by createdAt ascending as baseline (oldest first → new ones naturally at bottom)
  const base = [...tasks].sort((a, b) =>
    new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime()
  );
  if (order.length === 0) return base;
  const map = new Map(base.map((t) => [t.id, t]));
  const ordered: Task[] = [];
  // First: tasks in saved drag order
  for (const id of order) { if (map.has(id)) { ordered.push(map.get(id)!); map.delete(id); } }
  // Remaining new tasks (not yet in order) → append at bottom
  for (const t of map.values()) ordered.push(t);
  return ordered;
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export const TasksPage: React.FC = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'COMPLETED'>('ALL');
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([]);
  const prevAllDone = useRef(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => tasksService.getAll({ page: 1, limit: 200 }),
  });

  const tasks = data?.data ?? [];

  // Sync orderedTasks when server data arrives, preserving drag order
  useEffect(() => {
    if (tasks.length === 0) return;
    const saved = loadOrder();
    setOrderedTasks(applyOrder(tasks, saved));
  }, [data]);

  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const todoCount = total - completedCount;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const allDone = total > 0 && completedCount === total;

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      setShowAllDone(true);
      setTimeout(fireConfetti, 200);
    }
    if (!allDone) setShowAllDone(false);
    prevAllDone.current = allDone;
  }, [allDone]);

  const handleReorder = (newOrder: Task[]) => {
    setOrderedTasks(newOrder);
    saveOrder(newOrder.map((t) => t.id));
  };

  const createMut = useMutation({
    mutationFn: tasksService.create,
    onSuccess: (newTask) => {
      // Append new task to the END of the saved order
      const current = loadOrder();
      saveOrder([...current, newTask.id]);
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  });

  const handleAdd = useCallback((title: string, description: string, priority: string, dueDate?: string) => {
    createMut.mutate({
      title,
      description: description || undefined,
      priority: priority as any,
      status: 'TODO',
      dueDate: dueDate || undefined,
    } as any);
  }, [createMut]);

  // Filter the ordered list
  const filtered = orderedTasks.filter((t) =>
    filter === 'ALL' ? true : filter === 'TODO' ? t.status !== 'COMPLETED' : t.status === 'COMPLETED'
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header with progress ring */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6">
        <CircularProgress pct={pct} size={110} stroke={8} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-1">Task Board</h1>
          <p className="text-gray-400 text-sm mb-4">Sprint tracker — drag to reorder tasks</p>
          <div className="flex items-center gap-4">
            {[
              { label: 'Total', value: total, color: 'text-white' },
              { label: 'To Do', value: todoCount, color: 'text-amber-400' },
              { label: 'Done', value: completedCount, color: 'text-green-400' },
              { label: 'Overdue', value: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length, color: 'text-red-400' },
            ].map(({ label, value, color }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className="w-px h-8 bg-border" />}
                <div className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </motion.div>

      {/* All done banner */}
      <AnimatePresence>{showAllDone && <AllDoneBanner />}</AnimatePresence>

      {/* Quick-add form */}
      <QuickAddForm onAdd={handleAdd} loading={createMut.isPending} />


      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'TODO', 'COMPLETED'] as const).map((f) => {
          const count = f === 'ALL' ? total : f === 'TODO' ? todoCount : completedCount;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${filter === f ? 'bg-accent text-white' : 'bg-surface-secondary border border-border text-gray-400 hover:text-white'}`}>
              {f === 'COMPLETED' && <CheckCircle2 size={13} />}
              {f === 'TODO' && <Circle size={13} />}
              {f.charAt(0) + f.slice(1).toLowerCase()}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20' : 'bg-surface-elevated'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Drag hint */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
          <GripVertical size={12} />
          Drag to reorder
        </div>
      </div>

      {/* Task list — draggable */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-secondary border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <CheckCircle2 size={28} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-medium">
            {filter === 'COMPLETED' ? 'No completed tasks yet' : filter === 'TODO' ? 'All tasks completed! 🎉' : 'No tasks yet'}
          </p>
          {filter === 'ALL' && <p className="text-gray-600 text-sm">Use the form above to add your first task</p>}
        </motion.div>
      ) : (
        <Reorder.Group
          axis="y"
          values={filtered}
          onReorder={(newFiltered) => {
            // Merge reordered filtered list back into full orderedTasks
            const filteredIds = new Set(newFiltered.map((t) => t.id));
            const rest = orderedTasks.filter((t) => !filteredIds.has(t.id));
            // Insert filtered items at their original position block
            const firstIdx = orderedTasks.findIndex((t) => filteredIds.has(t.id));
            const merged = [...rest.slice(0, firstIdx), ...newFiltered, ...rest.slice(firstIdx)];
            handleReorder(merged);
          }}
          className="space-y-2.5 outline-none"
          style={{ listStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                updating={updateMut.isPending}
                onComplete={() => updateMut.mutate({ id: task.id, data: { status: 'COMPLETED' } })}
                onIncomplete={() => updateMut.mutate({ id: task.id, data: { status: 'TODO' } })}
                onDelete={() => {
                  if (confirm(`Delete "${task.title}"?`)) deleteMut.mutate(task.id);
                }}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  );
};
