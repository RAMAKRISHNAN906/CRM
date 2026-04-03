import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Plus, Trash2, Pencil, X, CheckCircle2,
  Clock, AlertTriangle, Users, ListTodo, Calendar,
  ChevronRight, Circle, BarChart2, Target, Search,
  ArrowRight,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────
type ProjectStatus   = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type TaskStatus      = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

interface Member { id: string; name: string; avatar?: string }
interface ProjectMember { id: string; role: string; user: Member }
interface ProjectTask {
  id: string; title: string; description?: string;
  status: TaskStatus; priority: ProjectPriority;
  dueDate?: string; completedAt?: string; order: number;
  assignee?: Member;
}
interface Project {
  id: string; name: string; description?: string;
  status: ProjectStatus; priority: ProjectPriority;
  startDate?: string; endDate?: string; budget?: number;
  tags: string[]; createdAt: string;
  createdBy: Member;
  members: ProjectMember[];
  tasks?: ProjectTask[];
  _count: { tasks: number; members: number };
}

// ── Config maps ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PLANNING:    { label: 'Planning',     color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',   icon: <Circle size={12} /> },
  IN_PROGRESS: { label: 'In Progress',  color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', icon: <Clock size={12} /> },
  ON_HOLD:     { label: 'On Hold',      color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30',  icon: <AlertTriangle size={12} /> },
  COMPLETED:   { label: 'Completed',    color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30',  icon: <CheckCircle2 size={12} /> },
  CANCELLED:   { label: 'Cancelled',    color: 'text-gray-400',   bg: 'bg-gray-500/15 border-gray-500/30',   icon: <X size={12} /> },
};

const PRIORITY_CFG: Record<ProjectPriority, { label: string; color: string }> = {
  LOW:      { label: 'Low',      color: 'text-gray-400' },
  MEDIUM:   { label: 'Medium',   color: 'text-blue-400' },
  HIGH:     { label: 'High',     color: 'text-amber-400' },
  CRITICAL: { label: 'Critical', color: 'text-red-400' },
};

const TASK_STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO:        { label: 'To Do',       color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  IN_REVIEW:   { label: 'In Review',   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  DONE:        { label: 'Done',        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
};

const TASK_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function progressOf(tasks: ProjectTask[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100);
}

// ── Project Form Modal ────────────────────────────────────────────────────────
const defaultForm = { name: '', description: '', status: 'PLANNING' as ProjectStatus, priority: 'MEDIUM' as ProjectPriority, startDate: '', endDate: '', budget: '' };

const ProjectFormModal: React.FC<{
  initial?: Project | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}> = ({ initial, onClose, onSave, isPending }) => {
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
    status:      initial?.status      ?? 'PLANNING' as ProjectStatus,
    priority:    initial?.priority    ?? 'MEDIUM'   as ProjectPriority,
    startDate:   initial?.startDate   ? initial.startDate.slice(0, 10) : '',
    endDate:     initial?.endDate     ? initial.endDate.slice(0, 10)   : '',
    budget:      initial?.budget?.toString() ?? '',
  });

  return (
    <Modal isOpen onClose={onClose} title={initial ? `Edit ${initial.name}` : 'New Project'}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Project Name *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="Project overview..."
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
              {(Object.keys(STATUS_CFG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
              {(Object.keys(PRIORITY_CFG) as ProjectPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Start Date</label>
            <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">End Date</label>
            <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Budget (₹)</label>
          <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" min={0} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, budget: form.budget ? parseFloat(form.budget) : undefined })}
            disabled={isPending || !form.name.trim()}>
            {isPending ? 'Saving...' : initial ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Task Form ────────────────────────────────────────────────────────────────
const TaskForm: React.FC<{
  projectId: string;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  members: ProjectMember[];
  initial?: ProjectTask | null;
}> = ({ onClose, onSave, isPending, members, initial }) => {
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    status:      initial?.status      ?? 'TODO' as TaskStatus,
    priority:    initial?.priority    ?? 'MEDIUM' as ProjectPriority,
    dueDate:     initial?.dueDate     ? initial.dueDate.slice(0, 10) : '',
    assigneeId:  initial?.assignee?.id ?? '',
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-white/50 mb-1 block">Task Title *</label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task name..." autoFocus />
      </div>
      <div>
        <label className="text-xs text-white/50 mb-1 block">Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2} placeholder="Details..."
          className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
            {TASK_COLUMNS.map(s => <option key={s} value={s}>{TASK_STATUS_CFG[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Priority</label>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))}
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
            {(Object.keys(PRIORITY_CFG) as ProjectPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Due Date</label>
          <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Assignee</label>
          <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
            className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isPending || !form.title.trim()}>
          {isPending ? 'Saving...' : initial ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </div>
  );
};

// ── Project Detail View ───────────────────────────────────────────────────────
const ProjectDetail: React.FC<{ project: Project; onBack: () => void }> = ({ project, onBack }) => {
  const qc = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  const { data: detail } = useQuery({
    queryKey: ['project', project.id],
    queryFn: async () => { const r = await api.get(`/projects/${project.id}`); return r.data?.data ?? r.data; },
  });

  const proj: Project = detail ?? project;
  const tasks: ProjectTask[] = proj.tasks ?? [];
  const progress = progressOf(tasks);

  const createTask = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${project.id}/tasks`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); setShowTaskForm(false); toast.success('Task added'); },
    onError: () => toast.error('Failed to add task'),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/projects/${project.id}/tasks/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); setEditingTask(null); toast.success('Task updated'); },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${project.id}/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', project.id] }); toast.success('Task deleted'); },
    onError: () => toast.error('Failed to delete task'),
  });

  const quickStatus = (task: ProjectTask, status: TaskStatus) =>
    updateTask.mutate({ id: task.id, data: { ...task, status, assigneeId: task.assignee?.id } });

  const sc = STATUS_CFG[proj.status];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
          <FolderKanban size={14} /> Projects
        </button>
        <ChevronRight size={14} className="text-gray-600" />
        <span className="text-white font-semibold text-sm">{proj.name}</span>
      </div>

      {/* Project info card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{proj.name}</h1>
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                {sc.icon} {sc.label}
              </span>
              <span className={`text-xs font-medium ${PRIORITY_CFG[proj.priority].color}`}>
                {PRIORITY_CFG[proj.priority].label}
              </span>
            </div>
            {proj.description && <p className="text-gray-400 text-sm mt-2">{proj.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
              {proj.startDate && <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(proj.startDate)}</span>}
              {proj.endDate   && <span className="flex items-center gap-1"><ArrowRight size={11} /> {fmtDate(proj.endDate)}</span>}
              {proj.budget    && <span>Budget: ₹{proj.budget.toLocaleString('en-IN')}</span>}
              <span className="flex items-center gap-1"><Users size={11} /> {proj.members.length} member{proj.members.length !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1"><ListTodo size={11} /> {tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Progress</span>
              <span className={progress === 100 ? 'text-green-400 font-semibold' : 'text-white'}>{progress}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: progress === 100 ? '#22c55e' : progress > 50 ? '#7c3aed' : '#3b82f6' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{tasks.filter(t => t.status === 'DONE').length} done</span>
              <span>{tasks.filter(t => t.status !== 'DONE').length} remaining</span>
            </div>
          </div>
        )}
      </Card>

      {/* Kanban task board */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Tasks</h2>
        <Button size="sm" onClick={() => setShowTaskForm(true)}>
          <Plus size={13} className="mr-1" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TASK_COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col);
          const cfg = TASK_STATUS_CFG[col];
          return (
            <div key={col} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cfg.bg}`}>
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/5 ${cfg.color}`}>{colTasks.length}</span>
              </div>

              {/* Task cards */}
              <div className="flex flex-col gap-2 min-h-[80px]">
                <AnimatePresence>
                  {colTasks.map(task => (
                    <motion.div key={task.id}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 rounded-xl bg-surface-secondary border border-border hover:border-border-strong transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white leading-snug flex-1">{task.title}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setEditingTask(task)}
                            className="p-0.5 rounded text-gray-500 hover:text-amber-400 transition-colors">
                            <Pencil size={10} />
                          </button>
                          <button onClick={() => { if (window.confirm('Delete task?')) deleteTask.mutate(task.id); }}
                            className="p-0.5 rounded text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                      {task.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className={`text-xs ${PRIORITY_CFG[task.priority].color}`}>{PRIORITY_CFG[task.priority].label}</span>
                        {task.dueDate && (
                          <span className={`text-xs flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-400' : 'text-gray-600'}`}>
                            <Calendar size={9} /> {fmtDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <Users size={9} /> {task.assignee.name}
                        </p>
                      )}
                      {/* Quick status buttons */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {TASK_COLUMNS.filter(s => s !== col).map(s => (
                          <button key={s} onClick={() => quickStatus(task, s)}
                            className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${TASK_STATUS_CFG[s].bg} ${TASK_STATUS_CFG[s].color} opacity-60 hover:opacity-100`}>
                            → {TASK_STATUS_CFG[s].label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {colTasks.length === 0 && (
                  <div className="flex-1 rounded-xl border border-dashed border-border flex items-center justify-center py-6 text-xs text-gray-700">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Members section */}
      {proj.members.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Users size={14} /> Team Members</h3>
          <div className="flex flex-wrap gap-2">
            {proj.members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-border text-xs">
                <div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center text-white font-semibold text-xs">
                  {m.user.name[0]}
                </div>
                <span className="text-gray-300">{m.user.name}</span>
                <span className="text-gray-600">{m.role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add task modal */}
      {showTaskForm && (
        <Modal isOpen onClose={() => setShowTaskForm(false)} title="Add Task">
          <TaskForm
            projectId={project.id}
            members={proj.members}
            onClose={() => setShowTaskForm(false)}
            onSave={data => createTask.mutate(data)}
            isPending={createTask.isPending}
          />
        </Modal>
      )}

      {/* Edit task modal */}
      {editingTask && (
        <Modal isOpen onClose={() => setEditingTask(null)} title="Edit Task">
          <TaskForm
            projectId={project.id}
            members={proj.members}
            initial={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={data => updateTask.mutate({ id: editingTask.id, data })}
            isPending={updateTask.isPending}
          />
        </Modal>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ProjectsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => { const r = await api.get('/projects/stats'); return r.data?.data ?? r.data; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/projects?${params}`);
      return r.data;
    },
  });

  const projects: Project[] = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/projects', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: ['project-stats'] }); setShowForm(false); toast.success('Project created'); },
    onError: () => toast.error('Failed to create project'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/projects/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: ['project-stats'] }); setEditingProject(null); toast.success('Project updated'); },
    onError: () => toast.error('Failed to update project'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: ['project-stats'] }); toast.success('Project deleted'); },
    onError: () => toast.error('Failed to delete project'),
  });

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  const byStatus = statsData?.byStatus ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-0.5">Plan, track and deliver projects</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1.5" /> New Project
        </Button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Projects', value: statsData?.total ?? 0, icon: <FolderKanban size={16} />, color: '#6366f1' },
          { label: 'In Progress',    value: byStatus.find((s: any) => s.status === 'IN_PROGRESS')?._count ?? 0, icon: <Clock size={16} />, color: '#7c3aed' },
          { label: 'Completed',      value: byStatus.find((s: any) => s.status === 'COMPLETED')?._count  ?? 0, icon: <CheckCircle2 size={16} />, color: '#22c55e' },
          { label: 'Active Tasks',   value: statsData?.activeTasks ?? 0, icon: <ListTodo size={16} />, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: stat.color }}>
              {stat.icon}
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-surface-secondary border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['', ...Object.keys(STATUS_CFG)] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s ? 'bg-accent text-white border-accent' : 'border-border text-gray-400 hover:text-white hover:border-border-strong'
              }`}>
              {s ? STATUS_CFG[s as ProjectStatus].label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-500/10">
            <FolderKanban size={32} className="text-violet-400" />
          </div>
          <p className="text-gray-400 text-sm">No projects yet. Create your first one!</p>
          <Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1.5" /> New Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map((proj, idx) => {
              const sc = STATUS_CFG[proj.status];
              const pc = PRIORITY_CFG[proj.priority];
              const done  = proj._count.tasks; // approximate (no task data in list)
              const isOverdue = proj.endDate && new Date(proj.endDate) < new Date() && proj.status !== 'COMPLETED';
              return (
                <motion.div key={proj.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="p-4 border-white/8 hover:border-white/15 transition-all group cursor-pointer"
                    onClick={() => setSelectedProject(proj)}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate group-hover:text-accent-light transition-colors">
                          {proj.name}
                        </h3>
                        {proj.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{proj.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditingProject(proj)}
                          className="p-1 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete "${proj.name}"?`)) deleteMut.mutate(proj.id); }}
                          className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                      {isOverdue && <span className="text-xs text-red-400 flex items-center gap-0.5"><AlertTriangle size={10} /> Overdue</span>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                      <span className="flex items-center gap-1"><ListTodo size={10} /> {proj._count.tasks} tasks</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {proj._count.members} members</span>
                      {proj.endDate && <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(proj.endDate)}</span>}
                    </div>

                    {/* Member avatars */}
                    {proj.members.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {proj.members.slice(0, 5).map(m => (
                          <div key={m.id} title={m.user.name}
                            className="w-6 h-6 rounded-full bg-accent/30 border border-surface-elevated flex items-center justify-center text-white text-xs font-bold">
                            {m.user.name[0]}
                          </div>
                        ))}
                        {proj.members.length > 5 && (
                          <span className="text-xs text-gray-600">+{proj.members.length - 5}</span>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <ProjectFormModal
          onClose={() => setShowForm(false)}
          onSave={data => createMut.mutate(data)}
          isPending={createMut.isPending}
        />
      )}

      {/* Edit modal */}
      {editingProject && (
        <ProjectFormModal
          initial={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={data => updateMut.mutate({ id: editingProject.id, data })}
          isPending={updateMut.isPending}
        />
      )}
    </div>
  );
};
