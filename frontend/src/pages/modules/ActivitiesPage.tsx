import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesService, Activity, ActivityChannel, ActivityStatus } from '../../services/activities.service';
import {
  Calendar, Phone, Mail, MessageCircle, StickyNote, Video,
  Plus, X, Save, Edit3, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronRight, ExternalLink, User, Briefcase, Bell, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<ActivityChannel, { label: string; icon: React.ReactNode; color: string }> = {
  MEETING:   { label: 'Meeting',   icon: <Video size={13} />,          color: '#8b5cf6' },
  PHONE:     { label: 'Call',      icon: <Phone size={13} />,          color: '#3b82f6' },
  EMAIL:     { label: 'Email',     icon: <Mail size={13} />,           color: '#10b981' },
  WHATSAPP:  { label: 'WhatsApp',  icon: <MessageCircle size={13} />,  color: '#22c55e' },
  SMS:       { label: 'SMS',       icon: <MessageCircle size={13} />,  color: '#f59e0b' },
  NOTE:      { label: 'Note',      icon: <StickyNote size={13} />,     color: '#64748b' },
};

const STATUS_CONFIG: Record<ActivityStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', icon: <Clock size={11} /> },
  completed: { label: 'Completed', color: '#22c55e', icon: <CheckCircle2 size={11} /> },
  cancelled: { label: 'Cancelled', color: '#64748b', icon: <XCircle size={11} /> },
  no_show:   { label: 'No Show',   color: '#ef4444', icon: <AlertTriangle size={11} /> },
};

const fieldCls = 'w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent placeholder-gray-600';
const labelCls = 'block text-xs text-gray-500 mb-1';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function groupByDate(activities: Activity[]): Record<string, Activity[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  const groups: Record<string, Activity[]> = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    'This Week': [],
    Later: [],
    Earlier: [],
  };

  activities.forEach((a) => {
    const dt = a.scheduledAt ? new Date(a.scheduledAt) : new Date(a.createdAt);
    const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

    if (dt < now && a.activityStatus === 'scheduled') groups['Overdue'].push(a);
    else if (day.getTime() === today.getTime()) groups['Today'].push(a);
    else if (day.getTime() === tomorrow.getTime()) groups['Tomorrow'].push(a);
    else if (dt > now && dt <= weekEnd) groups['This Week'].push(a);
    else if (dt > weekEnd) groups['Later'].push(a);
    else groups['Earlier'].push(a);
  });

  // Remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
}

function fmtTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function entityName(a: Activity) {
  if (a.contact) return `${a.contact.firstName} ${a.contact.lastName}${a.contact.company ? ` · ${a.contact.company}` : ''}`;
  if (a.deal) return a.deal.title;
  if (a.lead) return `${a.lead.firstName} ${a.lead.lastName}`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Form Modal (Schedule Meeting / Log Activity)
// ─────────────────────────────────────────────────────────────────────────────
const ActivityFormModal: React.FC<{
  activity?: Activity;
  defaultChannel?: ActivityChannel;
  onClose: () => void;
}> = ({ activity, defaultChannel = 'MEETING', onClose }) => {
  const qc = useQueryClient();
  const isEdit = !!activity;
  const [form, setForm] = useState({
    channel: activity?.channel ?? defaultChannel,
    subject: activity?.subject ?? '',
    body: activity?.body ?? '',
    scheduledAt: activity?.scheduledAt ? new Date(activity.scheduledAt).toISOString().slice(0, 16) : '',
    duration: activity?.duration ?? 60,
    meetingLink: activity?.meetingLink ?? '',
    nextAction: activity?.nextAction ?? '',
    meetingSummary: activity?.meetingSummary ?? '',
    activityStatus: (activity?.activityStatus ?? 'scheduled') as ActivityStatus,
    contactId: activity?.contactId ?? '',
    dealId: activity?.dealId ?? '',
  });

  const isMeeting = form.channel === 'MEETING';

  const saveMut = useMutation({
    mutationFn: () => isEdit
      ? activitiesService.update(activity!.id, form)
      : activitiesService.create({ ...form, duration: form.duration || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['activity-stats'] });
      qc.invalidateQueries({ queryKey: ['upcoming-meetings'] });
      toast.success(isEdit ? 'Updated' : isMeeting ? 'Meeting scheduled' : 'Activity logged');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Activity' : isMeeting ? 'Schedule Meeting' : 'Log Activity'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Channel selector */}
          {!isEdit && (
            <div>
              <label className={labelCls}>Type</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_CONFIG) as ActivityChannel[]).map((ch) => {
                  const cfg = CHANNEL_CONFIG[ch];
                  return (
                    <button key={ch} onClick={() => setForm({ ...form, channel: ch })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all"
                      style={form.channel === ch
                        ? { background: `${cfg.color}20`, borderColor: cfg.color, color: cfg.color }
                        : { borderColor: 'var(--border)', color: 'var(--gray-400)' }}>
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Subject *</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder={isMeeting ? 'Product Demo with Acme Corp' : 'Call with John regarding proposal'}
              className={fieldCls} />
          </div>

          {isMeeting && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date & Time *</label>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Duration</label>
                <select value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                  className={fieldCls}>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? 's' : ''}`}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Meeting Link</label>
                <input value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  placeholder="https://meet.google.com/..." className={fieldCls} />
              </div>
            </div>
          )}

          {!isMeeting && (
            <div>
              <label className={labelCls}>Date & Time</label>
              <input type="datetime-local" value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className={fieldCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>{isMeeting ? 'Agenda' : 'Notes'}</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3} placeholder={isMeeting ? 'Meeting agenda and topics...' : 'What was discussed...'}
              className={`${fieldCls} resize-none`} />
          </div>

          {isEdit && (
            <>
              <div>
                <label className={labelCls}>Status</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as ActivityStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button key={s} onClick={() => setForm({ ...form, activityStatus: s })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all"
                        style={form.activityStatus === s
                          ? { background: `${cfg.color}20`, borderColor: cfg.color, color: cfg.color }
                          : { borderColor: 'var(--border)', color: 'var(--gray-400)' }}>
                        {cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Meeting Summary</label>
                <textarea value={form.meetingSummary} onChange={(e) => setForm({ ...form, meetingSummary: e.target.value })}
                  rows={2} placeholder="What was discussed, decisions made..."
                  className={`${fieldCls} resize-none`} />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Next Action</label>
            <input value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
              placeholder="Send proposal by Friday..." className={fieldCls} />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => saveMut.mutate()} disabled={!form.subject || saveMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-50">
            <Save size={14} /> {saveMut.isPending ? 'Saving...' : isEdit ? 'Update' : isMeeting ? 'Schedule' : 'Log'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 border border-border text-sm text-gray-400 rounded-xl hover:text-white transition-all">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity Detail Slide-over
// ─────────────────────────────────────────────────────────────────────────────
const ActivityDetailPanel: React.FC<{ activity: Activity; onClose: () => void; onEdit: () => void }> = ({ activity, onClose, onEdit }) => {
  const qc = useQueryClient();
  const cfg = CHANNEL_CONFIG[activity.channel];
  const statusCfg = STATUS_CONFIG[activity.activityStatus ?? 'scheduled'];

  const [summary, setSummary] = useState(activity.meetingSummary ?? '');
  const [nextAction, setNextAction] = useState(activity.nextAction ?? '');

  const updateMut = useMutation({
    mutationFn: (data: Partial<Activity>) => activitiesService.update(activity.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); toast.success('Saved'); },
  });

  const markStatus = (s: ActivityStatus) => updateMut.mutate({ activityStatus: s });

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <motion.div
        initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-[380px] h-full bg-surface-elevated border-l border-border shadow-2xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.color}20`, color: cfg.color }}>
                {cfg.icon}
              </div>
              <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onEdit} className="text-gray-500 hover:text-white p-1"><Edit3 size={14} /></button>
              <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
            </div>
          </div>
          <h2 className="text-sm font-bold text-white leading-snug">{activity.subject}</h2>
          {entityName(activity) && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <User size={10} /> {entityName(activity)}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="px-5 py-3 border-b border-border space-y-2">
          {activity.scheduledAt && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar size={12} />
              <span>{fmtDate(activity.scheduledAt)} · {fmtTime(activity.scheduledAt)}</span>
              {activity.duration && <span className="text-gray-600">· {activity.duration}min</span>}
            </div>
          )}
          {activity.meetingLink && (
            <a href={activity.meetingLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-accent-light hover:text-white transition-colors">
              <ExternalLink size={11} /> Join Meeting
            </a>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: `${statusCfg.color}20`, color: statusCfg.color }}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Status quick actions */}
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs text-gray-600 mb-2">Update Status</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_CONFIG) as ActivityStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const isActive = activity.activityStatus === s;
              return (
                <button key={s} onClick={() => markStatus(s)} disabled={isActive}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-60"
                  style={isActive
                    ? { background: `${cfg.color}20`, borderColor: cfg.color, color: cfg.color }
                    : { borderColor: 'var(--border)', color: 'var(--gray-400)' }}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda / body */}
        {activity.body && (
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs text-gray-600 mb-1">Agenda / Notes</p>
            <p className="text-xs text-gray-300 whitespace-pre-wrap">{activity.body}</p>
          </div>
        )}

        {/* Summary & Next Action */}
        <div className="px-5 py-3 flex-1 space-y-3">
          <div>
            <label className={labelCls}>Meeting Summary</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              rows={3} placeholder="What was discussed, decisions made..."
              className={`${fieldCls} resize-none text-xs`} />
          </div>
          <div>
            <label className={labelCls}>Next Action</label>
            <div className="flex gap-2">
              <input value={nextAction} onChange={(e) => setNextAction(e.target.value)}
                placeholder="Send proposal by Friday..." className={`${fieldCls} text-xs flex-1`} />
            </div>
          </div>
          <button
            onClick={() => updateMut.mutate({ meetingSummary: summary, nextAction })}
            disabled={updateMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-medium rounded-xl disabled:opacity-50 w-full justify-center">
            <Save size={12} /> Save Summary & Next Action
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Activity Card
// ─────────────────────────────────────────────────────────────────────────────
const ActivityCard: React.FC<{ activity: Activity; onClick: () => void }> = ({ activity, onClick }) => {
  const cfg = CHANNEL_CONFIG[activity.channel];
  const status = activity.activityStatus ?? (activity.channel === 'MEETING' ? 'scheduled' : 'completed');
  const sCfg = STATUS_CONFIG[status as ActivityStatus] ?? STATUS_CONFIG.scheduled;
  const isSystemReminder = activity.metadata?.isSystemReminder;
  if (isSystemReminder) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex gap-3 p-3 rounded-xl bg-surface-secondary border border-border hover:border-border-strong transition-all cursor-pointer group"
    >
      {/* Channel icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${cfg.color}15`, color: cfg.color }}>
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white truncate group-hover:text-accent-light">
            {activity.subject}
          </h4>
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${sCfg.color}15`, color: sCfg.color }}>
            {sCfg.icon} {sCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {activity.scheduledAt && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={9} /> {fmtTime(activity.scheduledAt)}
              {activity.duration && ` · ${activity.duration}min`}
            </span>
          )}
          {entityName(activity) && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <User size={9} /> {entityName(activity)}
            </span>
          )}
        </div>

        {activity.nextAction && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-400">
            <ArrowRight size={9} /> {activity.nextAction}
          </div>
        )}
      </div>

      {activity.meetingLink && (
        <a href={activity.meetingLink} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 text-accent-light hover:text-white mt-0.5">
          <ExternalLink size={13} />
        </a>
      )}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export const ActivitiesPage: React.FC = () => {
  const [showForm, setShowForm] = useState<{ open: boolean; channel: ActivityChannel; editing?: Activity }>({
    open: false, channel: 'MEETING',
  });
  const [selected, setSelected] = useState<Activity | null>(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('upcoming');

  const now = new Date();
  const filters: Record<string, any> = {
    channel: channelFilter || undefined,
    activityStatus: statusFilter || undefined,
  };
  if (dateFilter === 'today') {
    filters.from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    filters.to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  } else if (dateFilter === 'upcoming') {
    filters.from = now.toISOString();
  } else if (dateFilter === 'past') {
    filters.to = now.toISOString();
  }

  const { data, isLoading } = useQuery({
    queryKey: ['activities', channelFilter, statusFilter, dateFilter],
    queryFn: () => activitiesService.getAll(filters),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['activity-stats'],
    queryFn: activitiesService.getStats,
    refetchInterval: 60000,
  });

  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: () => activitiesService.getUpcoming(7),
  });

  const activities = (data?.data ?? []).filter((a) => !a.metadata?.isSystemReminder);
  const grouped = groupByDate(activities);

  const openEdit = (a: Activity) => {
    setSelected(null);
    setShowForm({ open: true, channel: a.channel, editing: a });
  };

  const filterCls = 'bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent';

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Activities</h1>
          <p className="text-xs text-gray-400 mt-0.5">Meetings, calls, emails — with reminders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm({ open: true, channel: 'PHONE' })}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-gray-400 hover:text-white hover:border-border-strong transition-all">
            <Plus size={13} /> Log Activity
          </button>
          <button onClick={() => setShowForm({ open: true, channel: 'MEETING' })}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
            <Video size={14} /> Schedule Meeting
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Upcoming', value: stats.upcomingMeetings, color: '#8b5cf6', icon: <Video size={14} /> },
            { label: 'Completed Today', value: stats.completedToday, color: '#22c55e', icon: <CheckCircle2 size={14} /> },
            { label: 'Pending Actions', value: stats.pendingActions, color: '#f59e0b', icon: <ArrowRight size={14} /> },
            { label: 'This Week', value: stats.thisWeekTotal, color: '#3b82f6', icon: <Calendar size={14} /> },
            { label: 'Overdue', value: stats.overdueCount, color: '#ef4444', icon: <AlertTriangle size={14} /> },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: s.value > 0 && s.label === 'Overdue' ? '#ef4444' : 'white' }}>
                {s.value}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main timeline */}
        <div className="flex-1 space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={filterCls}>
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className={filterCls}>
              <option value="">All Types</option>
              {(Object.keys(CHANNEL_CONFIG) as ActivityChannel[]).map((ch) => (
                <option key={ch} value={ch}>{CHANNEL_CONFIG[ch].label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterCls}>
              <option value="">All Status</option>
              {(Object.keys(STATUS_CONFIG) as ActivityStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-surface-secondary border border-border animate-pulse" />
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center bg-surface-elevated rounded-2xl border border-border">
              <Calendar size={40} className="text-gray-700" />
              <p className="text-gray-400 text-sm">No activities found.</p>
              <button onClick={() => setShowForm({ open: true, channel: 'MEETING' })}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-xl">
                <Plus size={13} /> Schedule your first meeting
              </button>
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    group === 'Overdue' ? 'bg-red-500/15 text-red-400' :
                    group === 'Today' ? 'bg-accent/15 text-accent-light' :
                    'text-gray-500'
                  }`}>{group}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-gray-600">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <ActivityCard key={a.id} activity={a} onClick={() => setSelected(a)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming meetings widget */}
        {upcomingMeetings.length > 0 && (
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-surface-elevated border border-border rounded-2xl p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-accent-light" />
                <h3 className="text-sm font-semibold text-white">Upcoming (7 days)</h3>
              </div>
              <div className="space-y-2.5">
                {upcomingMeetings.slice(0, 6).map((m) => (
                  <div key={m.id} onClick={() => setSelected(m)}
                    className="cursor-pointer group p-2.5 rounded-xl hover:bg-surface-secondary transition-colors border border-transparent hover:border-border">
                    <p className="text-xs font-medium text-white group-hover:text-accent-light truncate">{m.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fmtDate(m.scheduledAt)} · {fmtTime(m.scheduledAt)}
                    </p>
                    {entityName(m) && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">{entityName(m)}</p>
                    )}
                    {m.meetingLink && (
                      <a href={m.meetingLink} target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-accent-light mt-1 hover:text-white">
                        <ExternalLink size={9} /> Join
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm.open && (
          <ActivityFormModal
            activity={showForm.editing}
            defaultChannel={showForm.channel}
            onClose={() => setShowForm({ open: false, channel: 'MEETING' })}
          />
        )}
        {selected && (
          <ActivityDetailPanel
            activity={selected}
            onClose={() => setSelected(null)}
            onEdit={() => openEdit(selected)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
