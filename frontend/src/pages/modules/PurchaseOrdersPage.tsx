import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ClipboardCheck, Plus, X, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';

interface POLineItem { description: string; quantity: number; unitPrice: number; total: number; }
interface PurchaseOrder {
  id: string; poNumber: string; status: POStatus; currency: string;
  subtotal: number; tax: number; total: number; notes?: string;
  deal?: { title: string }; invoice?: { invoiceNumber: string };
  createdBy: { name: string }; lineItems: POLineItem[]; createdAt: string;
}

const STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400',
  SENT: 'bg-blue-500/15 text-blue-400',
  CONFIRMED: 'bg-violet-500/15 text-violet-400',
  RECEIVED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

const EMPTY_LINE: POLineItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

const POModal: React.FC<{ po?: PurchaseOrder; onClose: () => void }> = ({ po, onClose }) => {
  const qc = useQueryClient();
  const isEdit = !!po;
  const [form, setForm] = useState({
    status: po?.status ?? 'DRAFT' as POStatus,
    currency: po?.currency ?? 'INR',
    notes: po?.notes ?? '',
    tax: po?.tax ?? 0,
  });
  const [lines, setLines] = useState<POLineItem[]>(po?.lineItems?.length ? po.lineItems : [{ ...EMPTY_LINE }]);

  const recalcLine = (idx: number, field: keyof POLineItem, val: string) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, [field]: parseFloat(val) || 0 };
      next.total = parseFloat((next.quantity * next.unitPrice).toFixed(2));
      return next;
    }));
  };

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const total = subtotal + form.tax;

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { ...form, subtotal, total, lineItems: lines };
      return isEdit
        ? api.put(`/purchase-orders/${po!.id}`, payload)
        : api.post('/purchase-orders', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success(isEdit ? 'PO updated' : 'PO created'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const fieldCls = 'w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent';
  const inputCls = 'w-full bg-surface-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{isEdit ? `Edit ${po!.poNumber}` : 'New Purchase Order'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as POStatus })} className={fieldCls}>
              {Object.keys(STATUS_COLORS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={fieldCls}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tax (flat)</label>
            <input type="number" min="0" value={form.tax}
              onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })}
              className={fieldCls} />
          </div>
        </div>

        {/* Line items */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">Line Items</p>
            <button onClick={() => setLines((p) => [...p, { ...EMPTY_LINE }])}
              className="flex items-center gap-1 text-xs text-accent-light hover:text-white transition-colors">
              <Plus size={12} /> Add Row
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1 px-1">
            {['Description', 'Qty', 'Unit Price', 'Total', ''].map((h, i) => (
              <span key={i} className={`text-xs text-gray-600 ${i === 0 ? 'col-span-6' : 'col-span-2'} ${i === 3 ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>
          <div className="space-y-2 bg-surface-secondary rounded-xl p-3 border border-border">
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input className={`col-span-6 ${inputCls}`} placeholder="Description" value={l.description}
                  onChange={(e) => setLines((p) => p.map((li, i) => i === idx ? { ...li, description: e.target.value } : li))} />
                <input className={`col-span-2 ${inputCls} text-center`} type="number" min="0" value={l.quantity}
                  onChange={(e) => recalcLine(idx, 'quantity', e.target.value)} />
                <input className={`col-span-2 ${inputCls}`} type="number" min="0" value={l.unitPrice}
                  onChange={(e) => recalcLine(idx, 'unitPrice', e.target.value)} />
                <span className="col-span-1 text-xs text-green-400 font-semibold text-right">{l.total.toFixed(2)}</span>
                <button onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                  className="col-span-1 flex justify-center text-gray-600 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-5">
          <div className="w-48 space-y-1.5 bg-surface-secondary rounded-xl p-3 border border-border text-sm">
            {[['Subtotal', subtotal], ['Tax', form.tax], ['Total', total]].map(([label, val], i) => (
              <div key={label as string} className={`flex justify-between ${i === 2 ? 'font-bold border-t border-border pt-1.5' : 'text-gray-400'}`}>
                <span className={i === 2 ? 'text-white' : ''}>{label}</span>
                <span className={i === 2 ? 'text-green-400' : ''}>{formatCurrency(val as number)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2} className={`${fieldCls} resize-none mb-4`} placeholder="Internal notes..." />
        </div>

        <div className="flex gap-3">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-50">
            <Save size={14} /> {saveMut.isPending ? 'Saving...' : 'Save PO'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-border text-sm text-gray-400 rounded-xl hover:text-white hover:border-border-strong transition-all">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const PurchaseOrdersPage: React.FC = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | undefined>();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/purchase-orders${params}`);
      return res.data;
    },
  });

  const pos: PurchaseOrder[] = data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('Deleted'); },
  });

  const stats = {
    total: data?.meta?.total ?? 0,
    draft: pos.filter((p) => p.status === 'DRAFT').length,
    confirmed: pos.filter((p) => p.status === 'CONFIRMED').length,
    value: pos.reduce((s, p) => s + p.total, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#0ea5e922' }}>
            <ClipboardCheck size={24} style={{ color: '#0ea5e9' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
            <p className="text-gray-400 text-sm">Deal → PO → Invoice flow · Auto-numbered</p>
          </div>
        </div>
        <button onClick={() => { setEditing(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-xl">
          <Plus size={15} /> New PO
        </button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total POs', value: stats.total },
          { label: 'Drafts', value: stats.draft },
          { label: 'Confirmed', value: stats.confirmed },
          { label: 'Total Value', value: formatCurrency(stats.value) },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-surface-elevated p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent">
          <option value="">All Status</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : pos.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <ClipboardCheck size={40} className="text-gray-700" />
            <p className="text-gray-400 text-sm">No purchase orders yet.</p>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-accent text-white text-sm rounded-xl">+ New PO</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['PO Number', 'Status', 'Deal', 'Invoice', 'Total', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.map((po, i) => (
                <motion.tr key={po.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-white">{po.poNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{po.deal?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{po.invoice?.invoiceNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-400">{formatCurrency(po.total)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatDate(po.createdAt, 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(po); setShowModal(true); }}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-surface-secondary transition-colors">Edit</button>
                      <button onClick={() => { if (confirm('Delete this PO?')) deleteMut.mutate(po.id); }}
                        className="text-xs text-gray-600 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showModal && <POModal po={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
      </AnimatePresence>
    </div>
  );
};
