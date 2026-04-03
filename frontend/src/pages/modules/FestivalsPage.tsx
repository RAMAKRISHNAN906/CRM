import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  festivalsService, Festival, FestivalCustomer, FestivalStats,
} from '../../services/festivals.service';
import {
  Gift, Plus, X, Send, Trash2, Mail, Phone, Users,
  Calendar, CheckCircle, AlertCircle, Clock, UserPlus,
  Wifi, WifiOff, ChevronDown, ChevronUp, Edit2, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJIS = ['🎉', '🎊', '🌙', '⭐', '🪔', '🎄', '🥳', '🌸', '🎆', '🎇', '🎑', '🎋', '🕌', '🙏', '❤️'];
const COUNTRIES = [['IN', 'India'], ['AE', 'UAE'], ['US', 'USA'], ['GB', 'UK'], ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['ALL', 'All Countries']];

const fieldCls = 'w-full bg-[#0d0d12] border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent placeholder-gray-600';

function toLocalDT(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Add Customer Panel ─────────────────────────────────────────────────────────
const AddCustomerForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const nameRef = useRef<HTMLInputElement>(null);

  const addMut = useMutation({
    mutationFn: () => festivalsService.addCustomer({
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['festival-customers'] });
      qc.invalidateQueries({ queryKey: ['festival-stats'] });
      setForm({ name: '', phone: '', email: '' });
      toast.success(`${form.name} added`);
      nameRef.current?.focus();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-2">
      <p className="text-xs text-accent font-medium mb-2 flex items-center gap-1.5"><UserPlus size={12} /> Add Customer</p>
      <input ref={nameRef} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Customer name *" className={fieldCls} />
      <div className="grid grid-cols-2 gap-2">
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+91 9876543210" className={fieldCls} />
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@example.com" className={fieldCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onDone(); setForm({ name: '', phone: '', email: '' }); }}
          className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-border rounded-xl">Cancel</button>
        <button onClick={() => addMut.mutate()} disabled={!form.name || addMut.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent text-white text-xs font-medium rounded-xl disabled:opacity-40">
          <Plus size={12} /> {addMut.isPending ? 'Adding...' : 'Add Customer'}
        </button>
      </div>
    </motion.div>
  );
};

// ── Customer Row ───────────────────────────────────────────────────────────────
const CustomerRow: React.FC<{ customer: FestivalCustomer }> = ({ customer }) => {
  const qc = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: () => festivalsService.deleteCustomer(customer.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['festival-customers'] });
      qc.invalidateQueries({ queryKey: ['festival-stats'] });
      toast.success('Removed');
    },
  });

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-secondary group transition-colors">
      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm flex-shrink-0">
        {customer.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{customer.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {customer.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} />{customer.phone}</span>}
          {customer.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} />{customer.email}</span>}
        </div>
      </div>
      <button onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
};

// ── Festival Card with inline send ─────────────────────────────────────────────
const FestivalCard: React.FC<{ festival: Festival; customerCount: number; onEdit: () => void }> = ({ festival, customerCount, onEdit }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState(festival.emailMessage ?? '');
  const [scheduledAt, setScheduledAt] = useState(toLocalDT(festival.scheduledAt));
  const [sending, setSending] = useState(false);

  const scheduledDate = festival.scheduledAt ? new Date(festival.scheduledAt) : null;
  const isScheduled = scheduledDate && scheduledDate > new Date() && !festival.isSent;

  const sendNow = async () => {
    if (customerCount === 0) { toast.error('Add at least one customer first'); return; }
    setSending(true);
    try {
      const result = await festivalsService.sendNow(festival.id, message || undefined);
      qc.invalidateQueries({ queryKey: ['festivals'] });
      qc.invalidateQueries({ queryKey: ['festival-stats'] });
      toast.success(
        `✅ Sent! Email: ${result.emailSent} | WhatsApp: ${result.whatsappSent}${result.failed > 0 ? ` | Failed: ${result.failed}` : ''}`,
        { duration: 5000 }
      );
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Send failed');
    } finally { setSending(false); }
  };

  const scheduleMut = useMutation({
    mutationFn: () => {
      if (!scheduledAt) throw new Error('Select a date and time');
      return festivalsService.schedule(festival.id, new Date(scheduledAt).toISOString(), message || undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['festivals'] });
      toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString('en-IN')}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden transition-all hover:border-border-strong">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-2xl flex-shrink-0">{festival.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm truncate">{festival.name}</h3>
            <span className="text-xs text-gray-600 flex-shrink-0">{festival.country}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span>{new Date(festival.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
            {isScheduled && (
              <span className="flex items-center gap-1 text-accent">
                <Clock size={10} /> {scheduledDate!.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {festival.isSent && <span className="flex items-center gap-1 text-green-400"><CheckCircle size={10} /> Sent</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-gray-600 hover:text-white transition-colors">
            <Edit2 size={13} />
          </button>
          {expanded ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </div>
      </div>

      {/* Expanded actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden">
            <div className="p-4 space-y-3">
              {/* Message box */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Greeting Message
                  <span className="ml-2 text-gray-700">(leave empty to use default) · use {'{name}'} {'{festival}'} {'{emoji}'}</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={`Default: "Dear {name}, Wishing you a wonderful ${festival.name}! ${festival.emoji} — NexusCRM Team"`}
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* Schedule row */}
              <div className="p-3 rounded-xl bg-[#0d0d12] border border-border space-y-2">
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Clock size={11} /> Schedule Auto-Send</p>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className={`${fieldCls} flex-1`}
                  />
                  <button
                    onClick={() => scheduleMut.mutate()}
                    disabled={!scheduledAt || scheduleMut.isPending}
                    className="px-4 py-2 bg-violet-600/20 border border-violet-600/30 text-violet-300 text-xs font-medium rounded-xl hover:bg-violet-600/30 disabled:opacity-40 transition-colors flex-shrink-0 flex items-center gap-1.5"
                  >
                    <Clock size={12} /> {scheduleMut.isPending ? 'Saving...' : 'Schedule'}
                  </button>
                </div>
                {isScheduled && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle size={11} /> Auto-send scheduled — {scheduledDate!.toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Send now */}
              <button
                onClick={sendNow}
                disabled={sending || customerCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
                {sending ? 'Sending...' : `Send Now to ${customerCount} Customer${customerCount !== 1 ? 's' : ''}`}
              </button>

              {customerCount === 0 && (
                <p className="text-xs text-yellow-400 text-center flex items-center justify-center gap-1">
                  <AlertCircle size={11} /> Add customers first using the button above
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Festival Form Modal ────────────────────────────────────────────────────────
const FestivalFormModal: React.FC<{ festival?: Festival; onClose: () => void }> = ({ festival, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: festival?.name ?? '',
    date: festival?.date ? festival.date.slice(0, 10) : '',
    country: festival?.country ?? 'IN',
    emoji: festival?.emoji ?? '🎉',
    isRecurring: festival?.isRecurring ?? false,
  });

  const mut = useMutation({
    mutationFn: () => {
      const payload = { ...form, targetTags: [], targetAll: true };
      return festival ? festivalsService.update(festival.id, payload) : festivalsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['festivals'] });
      qc.invalidateQueries({ queryKey: ['festival-stats'] });
      toast.success(festival ? 'Updated' : 'Festival created');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: () => festivalsService.delete(festival!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['festivals'] });
      qc.invalidateQueries({ queryKey: ['festival-stats'] });
      toast.success('Deleted');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{festival ? 'Edit Festival' : 'New Festival'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${form.emoji === em ? 'bg-accent/30 border-2 border-accent' : 'bg-surface-secondary border border-border'}`}>
                {em}
              </button>
            ))}
          </div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Festival name *" className={fieldCls} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldCls} />
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldCls}>
              {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary border border-border cursor-pointer">
            <span className="text-sm text-gray-300">Recurring yearly</span>
            <div onClick={() => setForm({ ...form, isRecurring: !form.isRecurring })}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.isRecurring ? 'bg-accent' : 'bg-gray-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isRecurring ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
          <div className="flex gap-2 pt-1">
            {festival && (
              <button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(); }}
                className="px-3 py-2.5 bg-red-500/10 text-red-400 text-sm rounded-xl hover:bg-red-500/20">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={() => mut.mutate()} disabled={!form.name || !form.date || mut.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-40">
              <Save size={14} /> {festival ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export const FestivalsPage: React.FC = () => {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [editFestival, setEditFestival] = useState<Festival | null>(null);

  const { data: festivals = [], isLoading: festivalsLoading } = useQuery({
    queryKey: ['festivals'],
    queryFn: festivalsService.getAll,
    refetchInterval: 30_000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['festival-customers'],
    queryFn: festivalsService.getCustomers,
  });

  const { data: stats } = useQuery({
    queryKey: ['festival-stats'],
    queryFn: festivalsService.getStats,
  });

  return (
    <div className="p-6 h-full">
      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
            <Gift size={22} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Festival Greetings</h1>
            <p className="text-gray-500 text-xs">Auto-send Email & WhatsApp to all customers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection badges */}
          {stats && (
            <>
              <span className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${stats.emailConfigured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                {stats.emailConfigured ? <Wifi size={11} /> : <WifiOff size={11} />} Email
              </span>
              <span className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${stats.whatsappConfigured ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'}`}>
                {stats.whatsappConfigured ? <Wifi size={11} /> : <WifiOff size={11} />} WhatsApp
              </span>
            </>
          )}
          <button onClick={() => setShowAddFestival(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-secondary border border-border text-gray-300 text-sm rounded-xl hover:border-border-strong transition-colors">
            <Plus size={14} /> Festival
          </button>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="flex gap-5 h-[calc(100vh-180px)]">

        {/* ── Left: Customers ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Customer header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-white">Customers</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-secondary text-gray-400 font-medium">
                {customers.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddCustomer(!showAddCustomer)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-xl hover:bg-accent/80 transition-colors"
            >
              <UserPlus size={12} /> Add
            </button>
          </div>

          {/* Add customer inline form */}
          <AnimatePresence>
            {showAddCustomer && <AddCustomerForm onDone={() => setShowAddCustomer(false)} />}
          </AnimatePresence>

          {/* Customer list */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface-elevated">
            {customersLoading ? (
              <div className="space-y-2 p-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-secondary animate-pulse" />)}
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
                <Users size={28} className="text-gray-700" />
                <p className="text-sm text-gray-500">No customers yet</p>
                <p className="text-xs text-gray-600">Click "Add" above to add your first customer</p>
                <button onClick={() => setShowAddCustomer(true)}
                  className="mt-2 px-4 py-2 bg-accent text-white text-xs rounded-xl hover:bg-accent/80 flex items-center gap-1.5">
                  <UserPlus size={12} /> Add Customer
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {customers.map((c) => <CustomerRow key={c.id} customer={c} />)}
              </div>
            )}
          </div>

          {/* Note */}
          {customers.length > 0 && (
            <p className="text-xs text-gray-600 text-center">
              All {customers.length} customer{customers.length !== 1 ? 's' : ''} receive greetings from every festival
            </p>
          )}
        </div>

        {/* ── Right: Festivals ── */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Gift size={14} className="text-amber-400" /> Festivals
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-secondary text-gray-400">{festivals.length}</span>
            </span>
            <p className="text-xs text-gray-600">Click a festival to expand and send</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {festivalsLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-secondary border border-border animate-pulse" />)
            ) : festivals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20">
                <Gift size={36} className="text-gray-700" />
                <p className="text-gray-400 text-sm">No festivals yet</p>
                <button onClick={() => setShowAddFestival(true)}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-xl hover:bg-accent/80 flex items-center gap-2">
                  <Plus size={14} /> Add Festival
                </button>
              </div>
            ) : (
              festivals.map((festival) => (
                <FestivalCard
                  key={festival.id}
                  festival={festival}
                  customerCount={customers.length}
                  onEdit={() => setEditFestival(festival)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddFestival && <FestivalFormModal onClose={() => setShowAddFestival(false)} />}
        {editFestival && <FestivalFormModal festival={editFestival} onClose={() => setEditFestival(null)} />}
      </AnimatePresence>
    </div>
  );
};
