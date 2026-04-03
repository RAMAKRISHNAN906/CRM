import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesService, Quote, QuoteLineItem, QuoteType, QuoteStatus, PaymentTerm } from '../../services/quotes.service';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  FileCheck, Plus, X, Save, Trash2, RefreshCw, Download,
  Settings, CreditCard, Building2, Upload, Edit3, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<QuoteType, string> = {
  SQ: 'Sales Quote', SO: 'Sales Order', SI: 'Sales Invoice', SCR: 'Credit Memo',
};
const TYPE_COLORS: Record<QuoteType, string> = {
  SQ: 'text-blue-400 bg-blue-500/10',
  SO: 'text-violet-400 bg-violet-500/10',
  SI: 'text-green-400 bg-green-500/10',
  SCR: 'text-amber-400 bg-amber-500/10',
};
const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT:     'bg-gray-500/15 text-gray-400',
  SENT:      'bg-blue-500/15 text-blue-400',
  ACCEPTED:  'bg-green-500/15 text-green-400',
  REJECTED:  'bg-red-500/15 text-red-400',
  EXPIRED:   'bg-amber-500/15 text-amber-400',
  CONVERTED: 'bg-violet-500/15 text-violet-400',
};
const EMPTY_LINE: QuoteLineItem = { description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0, total: 0 };

// ── Company Settings Modal ─────────────────────────────────────────────────
interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  footerAddress?: string;
  country: string;
  currency: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
}

const CompanySettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: existing } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/company');
      return res.data.data as CompanySettings | null;
    },
  });

  const [form, setForm] = useState<CompanySettings>({
    companyName: existing?.companyName ?? '',
    logoUrl: existing?.logoUrl ?? '',
    footerAddress: existing?.footerAddress ?? '',
    country: existing?.country ?? 'IN',
    currency: existing?.currency ?? 'INR',
    taxNumber: existing?.taxNumber ?? '',
    phone: existing?.phone ?? '',
    email: existing?.email ?? '',
    website: existing?.website ?? '',
  });

  // Sync form when existing loads
  React.useEffect(() => {
    if (existing) setForm({ ...existing });
  }, [existing]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, logoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await api.put('/settings/company', form);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Company settings saved');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const fieldCls = 'w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent placeholder-gray-600';
  const labelCls = 'block text-xs text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-accent-light" />
            <div>
              <h2 className="text-base font-bold text-white">Company Settings</h2>
              <p className="text-xs text-gray-400">Used in PDF headers and footers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* Logo upload */}
        <div className="mb-5 flex items-center gap-4">
          <div
            className="w-24 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-surface-secondary overflow-hidden cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Upload size={20} className="text-gray-600" />
            )}
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-xl text-sm text-gray-400 hover:text-white hover:border-border-strong transition-all">
              <Upload size={13} /> Upload Logo
            </button>
            <p className="text-xs text-gray-600 mt-1">PNG, JPG, SVG · Max 500KB</p>
            {form.logoUrl && (
              <button onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                className="text-xs text-red-400 hover:text-red-300 mt-1">Remove logo</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Company Name *</label>
            <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Acme Corp Ltd." className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Address / Footer Text</label>
            <textarea value={form.footerAddress} onChange={(e) => setForm({ ...form, footerAddress: e.target.value })}
              rows={2} placeholder="123 Main St, Mumbai, India 400001"
              className={`${fieldCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>GST / Tax Number</label>
            <input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
              placeholder="22AAAAA0000A1Z5" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="accounts@company.com" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://company.com" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Country (for FY)</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldCls}>
              <option value="IN">India (FY: Apr–Mar)</option>
              <option value="US">USA (FY: Jan–Dec)</option>
              <option value="AU">Australia (FY: Jul–Jun)</option>
              <option value="GB">UK (FY: Apr–Mar)</option>
              <option value="AE">UAE (FY: Jan–Dec)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={fieldCls}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !form.companyName}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-50">
            <Save size={14} /> {saveMut.isPending ? 'Saving...' : 'Save Settings'}
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

// ── Payment Terms Modal ────────────────────────────────────────────────────
const PaymentTermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const { data: terms = [] } = useQuery({ queryKey: ['payment-terms'], queryFn: quotesService.getPaymentTerms });
  const [editing, setEditing] = useState<PaymentTerm | null>(null);
  const [form, setForm] = useState({ name: '', description: '', content: '', isDefault: false });

  const resetForm = () => { setForm({ name: '', description: '', content: '', isDefault: false }); setEditing(null); };

  const saveMut = useMutation({
    mutationFn: () => editing
      ? quotesService.updatePaymentTerm(editing.id, form)
      : quotesService.createPaymentTerm(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-terms'] }); resetForm(); toast.success('Saved'); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: quotesService.deletePaymentTerm,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-terms'] }); toast.success('Deleted'); },
  });

  const startEdit = (t: PaymentTerm) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? '', content: t.content, isDefault: t.isDefault });
  };

  const fieldCls = 'w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent placeholder-gray-600';
  const labelCls = 'block text-xs text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-accent-light" />
            <h2 className="text-base font-bold text-white">Payment Terms</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* List */}
        <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
          {terms.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">No payment terms yet.</p>
          )}
          {terms.map((t) => (
            <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  {t.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent-light">Default</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.content}</p>
              </div>
              <button onClick={() => startEdit(t)} className="text-gray-500 hover:text-white flex-shrink-0">
                <Edit3 size={13} />
              </button>
              <button onClick={() => { if (confirm('Delete this term?')) deleteMut.mutate(t.id); }}
                className="text-gray-600 hover:text-red-400 flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add/edit form */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">{editing ? 'Edit Term' : 'Add New Term'}</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Net 30" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Description (optional)</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Payment within 30 days" className={fieldCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Terms Content (printed on PDF)</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3} placeholder="Payment is due within 30 days of invoice date. Late payments attract 2% monthly interest..."
                className={`${fieldCls} resize-none`} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  form.isDefault ? 'bg-accent border-accent' : 'border-gray-600'
                }`}>
                {form.isDefault && <Check size={10} className="text-white" />}
              </button>
              <label className="text-xs text-gray-400">Set as default payment term</label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={!form.name || !form.content || saveMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm rounded-xl disabled:opacity-50">
                <Save size={13} /> {editing ? 'Update' : 'Add Term'}
              </button>
              {editing && (
                <button onClick={resetForm}
                  className="px-4 py-2 border border-border text-sm text-gray-400 rounded-xl hover:text-white transition-all">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Line Item Row ──────────────────────────────────────────────────────────
const LineRow: React.FC<{
  item: QuoteLineItem; idx: number;
  onChange: (idx: number, field: keyof QuoteLineItem, val: any) => void;
  onRemove: (idx: number) => void;
}> = ({ item, idx, onChange, onRemove }) => {
  const recalc = (field: keyof QuoteLineItem, val: string) => {
    const next = { ...item, [field]: parseFloat(val) || 0 };
    const base = next.quantity * next.unitPrice;
    const afterDisc = base - (base * next.discount) / 100;
    const lineTotal = afterDisc + (afterDisc * next.tax) / 100;
    onChange(idx, field, parseFloat(val) || 0);
    onChange(idx, 'total', parseFloat(lineTotal.toFixed(2)));
  };

  const inputCls = 'w-full bg-surface-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent';
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <input className={`col-span-5 ${inputCls}`} placeholder="Description"
        value={item.description} onChange={(e) => onChange(idx, 'description', e.target.value)} />
      <input className={`col-span-1 ${inputCls} text-center`} type="number" min="0"
        value={item.quantity} onChange={(e) => recalc('quantity', e.target.value)} />
      <input className={`col-span-2 ${inputCls}`} type="number" min="0"
        value={item.unitPrice} onChange={(e) => recalc('unitPrice', e.target.value)} />
      <input className={`col-span-1 ${inputCls} text-center`} type="number" min="0" max="100"
        value={item.discount} onChange={(e) => recalc('discount', e.target.value)} />
      <input className={`col-span-1 ${inputCls} text-center`} type="number" min="0" max="100"
        value={item.tax} onChange={(e) => recalc('tax', e.target.value)} />
      <div className="col-span-1 text-xs text-green-400 font-semibold text-right pr-1">{item.total.toFixed(2)}</div>
      <button onClick={() => onRemove(idx)} className="col-span-1 flex justify-center text-gray-600 hover:text-red-400">
        <Trash2 size={13} />
      </button>
    </div>
  );
};

// ── Quote Modal ────────────────────────────────────────────────────────────
const QuoteModal: React.FC<{ quote?: Quote; onClose: () => void }> = ({ quote, onClose }) => {
  const qc = useQueryClient();
  const isEdit = !!quote;

  const { data: paymentTerms = [] } = useQuery({ queryKey: ['payment-terms'], queryFn: quotesService.getPaymentTerms });

  const [form, setForm] = useState({
    type: quote?.type ?? ('SQ' as QuoteType),
    status: quote?.status ?? ('DRAFT' as QuoteStatus),
    currency: quote?.currency ?? 'INR',
    country: quote?.country ?? 'IN',
    notes: quote?.notes ?? '',
    validUntil: quote?.validUntil?.slice(0, 10) ?? '',
    paymentTermId: quote?.paymentTermId ?? '',
  });

  const [lines, setLines] = useState<QuoteLineItem[]>(
    quote?.lineItems?.length ? quote.lineItems : [{ ...EMPTY_LINE }]
  );

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalDiscount = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.discount) / 100, 0);
  const totalTax = lines.reduce((s, l) => {
    const base = l.quantity * l.unitPrice - (l.quantity * l.unitPrice * l.discount) / 100;
    return s + (base * l.tax) / 100;
  }, 0);
  const total = lines.reduce((s, l) => s + l.total, 0);

  const handleLine = (idx: number, field: keyof QuoteLineItem, val: any) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)));

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = { ...form, subtotal, discount: totalDiscount, tax: totalTax, total, lineItems: lines };
      return isEdit ? quotesService.update(quote!.id, payload) : quotesService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(isEdit ? 'Quote updated' : 'Quote created');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error saving quote'),
  });

  const fieldCls = 'w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent';
  const labelCls = 'block text-xs text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEdit ? `Edit — ${quote!.quoteNumber}` : 'New Quotation'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Auto-numbered · {form.type} → {TYPE_LABELS[form.type]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <label className={labelCls}>Document Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuoteType })} className={fieldCls}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuoteStatus })} className={fieldCls}>
              {Object.keys(STATUS_COLORS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={fieldCls}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Country (for FY)</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldCls}>
              <option value="IN">India (Apr–Mar)</option>
              <option value="US">USA (Jan–Dec)</option>
              <option value="AU">Australia (Jul–Jun)</option>
              <option value="GB">UK (Apr–Mar)</option>
              <option value="AE">UAE (Jan–Dec)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Valid Until</label>
            <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={fieldCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Payment Terms</label>
            <select value={form.paymentTermId} onChange={(e) => setForm({ ...form, paymentTermId: e.target.value })} className={fieldCls}>
              <option value="">— None —</option>
              {paymentTerms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Line items */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Line Items</p>
            <button onClick={() => setLines((p) => [...p, { ...EMPTY_LINE }])}
              className="flex items-center gap-1 text-xs text-accent-light hover:text-white transition-colors">
              <Plus size={12} /> Add Row
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1.5 px-1 text-xs text-gray-600">
            <span className="col-span-5">Description</span>
            <span className="col-span-1 text-center">Qty</span>
            <span className="col-span-2">Unit Price</span>
            <span className="col-span-1 text-center">Disc%</span>
            <span className="col-span-1 text-center">Tax%</span>
            <span className="col-span-1">Total</span>
            <span className="col-span-1" />
          </div>
          <div className="space-y-2 bg-surface-secondary rounded-xl p-3 border border-border">
            {lines.map((item, idx) => (
              <LineRow key={idx} item={item} idx={idx} onChange={handleLine}
                onRemove={(i) => setLines((p) => p.filter((_, j) => j !== i))} />
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-5">
          <div className="w-64 space-y-2 bg-surface-secondary rounded-xl p-4 border border-border text-sm">
            {[['Subtotal', subtotal], ['Discount (−)', -totalDiscount], ['Tax (+)', totalTax]].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-gray-400">
                <span>{label}</span>
                <span className={(val as number) < 0 ? 'text-red-400' : ''}>{formatCurrency(Math.abs(val as number))}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span className="text-white">Total</span>
              <span className="text-green-400 text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className={labelCls}>Internal Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2} placeholder="Additional notes..." className={`${fieldCls} resize-none`} />
        </div>

        <div className="flex gap-3">
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-xl disabled:opacity-50">
            <Save size={14} /> {saveMut.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-border text-sm text-gray-400 rounded-xl hover:text-white transition-all">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const QuotesPage: React.FC = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Quote | undefined>();
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showPaymentTerms, setShowPaymentTerms] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', typeFilter, statusFilter],
    queryFn: () => quotesService.getAll({ type: typeFilter || undefined, status: statusFilter || undefined }),
  });
  const quotes = data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: quotesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Deleted'); },
  });

  const convertMut = useMutation({
    mutationFn: quotesService.convert,
    onSuccess: (q) => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success(`Converted → ${q.quoteNumber}`); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Cannot convert'),
  });

  const handlePdf = async (q: Quote) => {
    setPdfLoading(q.id);
    try {
      await quotesService.downloadPdf(q.id, q.quoteNumber);
      toast.success('PDF downloaded');
    } catch {
      toast.error('PDF generation failed');
    } finally {
      setPdfLoading(null);
    }
  };

  const stats = {
    total: data?.meta?.total ?? 0,
    draft: quotes.filter((q) => q.status === 'DRAFT').length,
    accepted: quotes.filter((q) => q.status === 'ACCEPTED').length,
    revenue: quotes.filter((q) => q.status === 'ACCEPTED').reduce((s, q) => s + q.total, 0),
  };

  const filterCls = 'bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-accent/10">
            <FileCheck size={22} className="text-accent-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Quotations & Invoices</h1>
            <p className="text-xs text-gray-400">SQ → SO → SI · Auto-numbered by FY</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPaymentTerms(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-gray-400 hover:text-white hover:border-border-strong transition-all">
            <CreditCard size={14} /> Payment Terms
          </button>
          <button onClick={() => setShowCompanySettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-gray-400 hover:text-white hover:border-border-strong transition-all">
            <Settings size={14} /> Company
          </button>
          <button onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={14} /> New Quote
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Drafts', value: stats.draft, color: '#64748b' },
          { label: 'Accepted', value: stats.accepted, color: '#22c55e' },
          { label: 'Revenue', value: formatCurrency(stats.revenue), color: '#10b981' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterCls}>
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterCls}>
          <option value="">All Status</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <FileCheck size={36} className="text-gray-700" />
            <p className="text-gray-400 text-sm">No quotes found.</p>
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-accent text-white text-sm rounded-xl">+ New Quote</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Quote #', 'Type', 'Status', 'Contact', 'Total', 'Valid Until', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((q, i) => (
                <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/40 hover:bg-surface-secondary transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-white">{q.quoteNumber}</span>
                    {q.financialYear && (
                      <span className="ml-1.5 text-xs text-gray-600">FY{q.financialYear.split('-')[0].slice(-2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[q.type]}`}>
                      {q.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {q.contact ? `${q.contact.firstName} ${q.contact.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-400">{formatCurrency(q.total)}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {q.validUntil ? formatDate(q.validUntil, 'MMM dd, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* PDF Download */}
                      <button
                        onClick={() => handlePdf(q)}
                        disabled={pdfLoading === q.id}
                        title="Download PDF"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        {pdfLoading === q.id
                          ? <span className="animate-spin text-xs">⟳</span>
                          : <Download size={12} />}
                        PDF
                      </button>
                      {/* Edit */}
                      <button onClick={() => { setEditing(q); setShowModal(true); }}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-surface-secondary transition-colors">
                        Edit
                      </button>
                      {/* Convert */}
                      {(q.type === 'SQ' || q.type === 'SO') && q.status !== 'CONVERTED' && (
                        <button onClick={() => convertMut.mutate(q.id)}
                          title={q.type === 'SQ' ? 'Convert to Sales Order' : 'Convert to Sales Invoice'}
                          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors">
                          <RefreshCw size={10} />
                          {q.type === 'SQ' ? '→SO' : '→SI'}
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => { if (confirm('Delete this quote?')) deleteMut.mutate(q.id); }}
                        className="text-gray-600 hover:text-red-400 px-1 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                        <Trash2 size={12} />
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
        {showModal && (
          <QuoteModal quote={editing} onClose={() => { setShowModal(false); setEditing(undefined); }} />
        )}
        {showCompanySettings && <CompanySettingsModal onClose={() => setShowCompanySettings(false)} />}
        {showPaymentTerms && <PaymentTermsModal onClose={() => setShowPaymentTerms(false)} />}
      </AnimatePresence>
    </div>
  );
};
