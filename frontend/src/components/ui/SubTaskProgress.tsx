/**
 * SubTaskProgress — circular progress ring + subtask checklist
 * Drop into any Task detail panel.
 *
 * Usage:
 *   <SubTaskProgress taskId={task.id} completionPct={task.completionPct ?? 0} />
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Check, Trash2, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

// ── Circular Progress Ring ────────────────────────────────────────────────
const ProgressRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 80 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - (pct / 100) * circumference;
  const color = pct === 100 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke="#1f2937" strokeWidth={8} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={8} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: strokeDash }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-bold text-white">{pct}%</span>
      </div>
    </div>
  );
};

// ── Celebration ───────────────────────────────────────────────────────────
const Celebration: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="flex items-center gap-2 px-3 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-sm"
  >
    <PartyPopper size={16} />
    <span className="font-medium">All subtasks completed! 🎉</span>
  </motion.div>
);

// ── Main Component ────────────────────────────────────────────────────────
interface Props {
  taskId: string;
  completionPct: number;
}

export const SubTaskProgress: React.FC<Props> = ({ taskId, completionPct }) => {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');

  const { data: subTasks = [] } = useQuery<SubTask[]>({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/subtasks`);
      return res.data.data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['subtasks', taskId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const createMut = useMutation({
    mutationFn: (title: string) => api.post(`/tasks/${taskId}/subtasks`, { title }),
    onSuccess: () => { invalidate(); setNewTitle(''); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.put(`/tasks/${taskId}/subtasks/${id}`, { isCompleted }),
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${taskId}/subtasks/${id}`),
    onSuccess: () => invalidate(),
  });

  const pct = completionPct ?? 0;
  const isDone = pct === 100 && subTasks.length > 0;

  return (
    <div className="space-y-4">
      {/* Progress ring + stats */}
      <div className="flex items-center gap-5">
        <ProgressRing pct={pct} size={72} />
        <div>
          <p className="text-sm font-medium text-white">Task Progress</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {subTasks.filter((s) => s.isCompleted).length} / {subTasks.length} subtasks done
          </p>
        </div>
      </div>

      {/* Celebration */}
      <AnimatePresence>
        {isDone && <Celebration />}
      </AnimatePresence>

      {/* Subtask list */}
      <div className="space-y-1.5">
        {subTasks.map((sub) => (
          <motion.div key={sub.id}
            layout
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-secondary border border-border group"
          >
            <button
              onClick={() => toggleMut.mutate({ id: sub.id, isCompleted: !sub.isCompleted })}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                sub.isCompleted
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-600 hover:border-accent'
              }`}
            >
              {sub.isCompleted && <Check size={11} className="text-white" strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-sm ${sub.isCompleted ? 'line-through text-gray-600' : 'text-gray-200'}`}>
              {sub.title}
            </span>
            <button onClick={() => deleteMut.mutate(sub.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add subtask */}
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) createMut.mutate(newTitle.trim()); }}
          placeholder="Add subtask..."
          className="flex-1 bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent"
        />
        <button
          onClick={() => newTitle.trim() && createMut.mutate(newTitle.trim())}
          disabled={!newTitle.trim()}
          className="px-3 py-2 bg-accent text-white rounded-xl disabled:opacity-40 flex items-center gap-1 text-sm"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
