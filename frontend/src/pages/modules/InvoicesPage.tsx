import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, Download, FileDown, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { formatCurrency, getCurrentCurrency, getCurrencySymbol } from '../../utils/formatters';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface LineItem { description: string; quantity: number; unitPrice: number }
interface Invoice {
  id: string; invoiceNumber: string; status: InvoiceStatus;
  currency: string; subtotal: number; tax: number; discount: number; total: number;
  dueDate?: string; paidAt?: string; notes?: string; createdAt: string;
  createdBy?: { name: string }; deal?: { title: string };
  lineItems?: LineItem[];
}

const fmt = (n: number, currency = getCurrentCurrency()) =>
  formatCurrency(n, currency, { notation: 'standard', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getAuthToken(): string {
  try {
    const raw = localStorage.getItem('crm-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.accessToken || '';
    }
  } catch {}
  return '';
}

async function downloadFile(url: string, filename: string) {
  try {
    const token = getAuthToken();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    toast.error('Download failed');
  }
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  DRAFT:     { label: 'Draft',     color: 'text-gray-400 bg-gray-500/20 border-gray-500/30',   icon: FileText },
  SENT:      { label: 'Sent',      color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',   icon: Clock },
  PAID:      { label: 'Paid',      color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: CheckCircle },
  OVERDUE:   { label: 'Overdue',   color: 'text-red-400 bg-red-500/20 border-red-500/30',      icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500 bg-gray-600/20 border-gray-600/30',   icon: FileText },
};

const defaultLineItem: LineItem = { description: '', quantity: 1, unitPrice: 0 };

// ── Shared form body (used in both Create and Edit modals) ──────────────────
interface InvoiceFormBodyProps {
  currency: string;
  lineItems: LineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  invoiceForm: { notes: string; dueDate: string; taxPct: number; discountPct: number };
  setInvoiceForm: React.Dispatch<React.SetStateAction<{ notes: string; dueDate: string; taxPct: number; discountPct: number }>>;
  subtotal: number; discountAmt: number; taxAmt: number; total: number;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}

function InvoiceFormBody({
  currency,
  lineItems, setLineItems, invoiceForm, setInvoiceForm,
  subtotal, discountAmt, taxAmt, total,
  onCancel, onSubmit, isPending, submitLabel,
}: InvoiceFormBodyProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const updateItem = (idx: number, field: keyof LineItem, value: any) =>
    setLineItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  return (
    <div className="space-y-5">

      {/* ── Line Items Table ── */}
      <div>
        <table className="w-full text-sm border-separate border-spacing-y-1.5">
          <thead>
            <tr>
              <th className="text-xs text-white/40 font-medium text-left pb-1 pl-1 w-[44%]">Description</th>
              <th className="text-xs text-white/40 font-medium text-center pb-1 w-[12%]">Qty</th>
              <th className="text-xs text-white/40 font-medium text-right pb-1 w-[22%]">Unit Price ({currencySymbol})</th>
              <th className="text-xs text-white/40 font-medium text-right pb-1 w-[18%]">Amount</th>
              <th className="w-[4%]" />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <motion.tr key={idx} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <td className="pr-2">
                    <Input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="Product / Service"
                      className="w-full text-sm"
                    />
                  </td>
                  <td className="px-1">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-full text-center text-sm"
                      min={1}
                    />
                  </td>
                  <td className="px-1">
                    <Input
                      type="number"
                      value={item.unitPrice === 0 ? '' : item.unitPrice}
                      onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full text-right text-sm"
                      min={0}
                    />
                  </td>
                  <td className="pl-2 text-right">
                    <span className="text-sm font-semibold text-white whitespace-nowrap">{fmt(lineTotal, currency)}</span>
                  </td>
                  <td className="pl-1 text-center">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => setLineItems(items => items.filter((_, i) => i !== idx))}
                        className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                      >×</button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        <button
          onClick={() => setLineItems(items => [...items, { ...defaultLineItem }])}
          className="mt-1 text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Line
        </button>
      </div>

      {/* ── Discount % + Tax % ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium">
            Discount %
            {invoiceForm.discountPct > 0 && (
              <span className="ml-2 text-red-400 font-semibold">−{fmt(discountAmt, currency)}</span>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={invoiceForm.discountPct === 0 ? '' : invoiceForm.discountPct}
              onChange={e => setInvoiceForm(f => ({ ...f, discountPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
              placeholder="0" className="pr-8" min={0} max={100}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">%</span>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {[5, 10, 15, 20].map(p => (
              <button key={p} onClick={() => setInvoiceForm(f => ({ ...f, discountPct: p }))}
                className={`px-2 py-0.5 rounded text-xs transition-colors border
                  ${invoiceForm.discountPct === p ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'border-white/10 text-white/30 hover:text-white/60'}`}>
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium">
            Tax / GST %
            {invoiceForm.taxPct > 0 && (
              <span className="ml-2 text-green-400 font-semibold">+{fmt(taxAmt, currency)}</span>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={invoiceForm.taxPct === 0 ? '' : invoiceForm.taxPct}
              onChange={e => setInvoiceForm(f => ({ ...f, taxPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
              placeholder="0" className="pr-8" min={0} max={100}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">%</span>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {[0, 5, 12, 18, 28].map(p => (
              <button key={p} onClick={() => setInvoiceForm(f => ({ ...f, taxPct: p }))}
                className={`px-2 py-0.5 rounded text-xs transition-colors border
                  ${invoiceForm.taxPct === p ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'border-white/10 text-white/30 hover:text-white/60'}`}>
                {p === 0 ? 'None' : `${p}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Due Date ── */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-medium">Due Date</label>
        <Input type="date" value={invoiceForm.dueDate}
          onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
      </div>

      {/* ── Summary ── */}
      <div className="rounded-xl overflow-hidden border border-white/8 bg-white/4">
        {[
          ...(invoiceForm.discountPct > 0 ? [] : []),
          { label: 'Subtotal', value: fmt(subtotal, currency), cls: 'text-white/60' },
          ...(invoiceForm.discountPct > 0 ? [{ label: `Discount (${invoiceForm.discountPct}%)`, value: `−${fmt(discountAmt, currency)}`, cls: 'text-red-400 font-medium' }] : []),
          ...(invoiceForm.taxPct > 0 ? [{ label: `Tax / GST (${invoiceForm.taxPct}%)`, value: `+${fmt(taxAmt, currency)}`, cls: 'text-green-400 font-medium' }] : []),
        ].map(({ label, value, cls }) => (
          <div key={label} className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-white/5">
            <span className="text-white/50">{label}</span>
            <motion.span key={value} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className={cls}>{value}</motion.span>
          </div>
        ))}
        <div className="flex justify-between items-center px-4 py-3 bg-white/5">
          <span className="text-white font-bold text-base">Total</span>
          <motion.span key={total} initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="text-white font-bold text-lg">
            {fmt(total, currency)}
          </motion.span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 justify-end pt-1">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} disabled={isPending || lineItems.every(i => !i.description || i.unitPrice === 0)}>
          {isPending ? 'Saving...' : submitLabel}
        </Button>
      </div>

    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const defaultCurrency = getCurrentCurrency();
  const [page] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...defaultLineItem }]);
  const [invoiceForm, setInvoiceForm] = useState({ notes: '', dueDate: '', taxPct: 18, discountPct: 0 });

  const subtotal    = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt = (subtotal * Number(invoiceForm.discountPct)) / 100;
  const afterDisc   = subtotal - discountAmt;
  const taxAmt      = (afterDisc * Number(invoiceForm.taxPct)) / 100;
  const total       = afterDisc + taxAmt;
  const activeCurrency = editingInvoice?.currency || defaultCurrency;

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => { const res = await api.get(`/invoices?page=${page}&limit=20`); return res.data; },
  });

  const createMutation = useMutation({
    mutationFn: async (d: any) => { const res = await api.post('/invoices', d); return res.data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); resetModal(); toast.success('Invoice created'); },
    onError: () => toast.error('Failed to create invoice'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/invoices/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); resetModal(); toast.success('Invoice updated'); },
    onError: () => toast.error('Failed to update invoice'),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => api.patch(`/invoices/${id}/status`, { status: 'PAID' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); },
    onError: () => toast.error('Failed to delete invoice'),
  });

  const resetModal = () => {
    setLineItems([{ ...defaultLineItem }]);
    setInvoiceForm({ notes: '', dueDate: '', taxPct: 18, discountPct: 0 });
    setShowModal(false);
    setEditingInvoice(null);
  };

  const openEdit = async (inv: Invoice) => {
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      const full: Invoice = res.data?.data ?? res.data;
      const sub = full.subtotal || 0;
      const discPct = sub > 0 ? Math.round((full.discount / sub) * 100) : 0;
      const afterD  = sub - full.discount;
      const tPct    = afterD > 0 ? Math.round((full.tax / afterD) * 100) : 0;
      setLineItems(full.lineItems?.length
        ? full.lineItems.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }))
        : [{ ...defaultLineItem }]);
      setInvoiceForm({ notes: full.notes || '', dueDate: full.dueDate ? full.dueDate.slice(0, 10) : '', taxPct: tPct, discountPct: discPct });
      setEditingInvoice(full);
    } catch { toast.error('Failed to load invoice'); }
  };

  const formProps = {
    currency: activeCurrency,
    lineItems, setLineItems, invoiceForm, setInvoiceForm,
    subtotal, discountAmt, taxAmt, total,
    onCancel: resetModal,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-white/50 text-sm mt-1">Create and track customer invoices</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {/* ── Invoice List ── */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)
            : data?.data?.map((inv: Invoice) => {
                const status = STATUS_CONFIG[inv.status];
                const Icon = status.icon;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="p-4 border-white/10">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 shrink-0 ${status.color.split(' ')[0]}`} />
                          <div>
                            <h3 className="text-white font-medium">{inv.invoiceNumber}</h3>
                            <p className="text-white/40 text-xs mt-0.5">
                              {inv.deal?.title && `${inv.deal.title} · `}
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                          <span className="text-white font-semibold min-w-[80px] text-right">
                            {formatCurrency(inv.total, inv.currency || defaultCurrency, { notation: 'standard', maximumFractionDigits: 0 })}
                          </span>

                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => downloadFile(`${API_URL}/invoices/${inv.id}/pdf`, `Invoice-${inv.invoiceNumber}.pdf`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                            title="Download PDF">
                            <Download size={12} /> PDF
                          </motion.button>

                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => downloadFile(`${API_URL}/invoices/${inv.id}/docx`, `Invoice-${inv.invoiceNumber}.docx`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                            title="Download Word">
                            <FileDown size={12} /> Word
                          </motion.button>

                          {inv.status === 'SENT' && (
                            <Button variant="ghost" size="sm"
                              onClick={() => markPaid.mutate(inv.id)}
                              className="text-green-400 hover:text-green-300 text-xs">
                              Mark Paid
                            </Button>
                          )}

                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => openEdit(inv)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors text-xs font-medium"
                            title="Edit Invoice">
                            <Pencil size={12} />
                          </motion.button>

                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { if (window.confirm(`Delete ${inv.invoiceNumber}?`)) deleteMutation.mutate(inv.id); }}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/15 text-red-500 hover:bg-red-500/15 hover:border-red-500/30 transition-colors text-xs font-medium disabled:opacity-40"
                            title="Delete Invoice">
                            <Trash2 size={12} />
                          </motion.button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
        </AnimatePresence>
        {!isLoading && (!data?.data || data.data.length === 0) && (
          <div className="text-center py-16 text-white/30">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No invoices yet.</p>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Modal isOpen={!!editingInvoice} onClose={resetModal} title={`Edit ${editingInvoice?.invoiceNumber ?? ''}`}>
        <InvoiceFormBody
          {...formProps}
          onSubmit={() => updateMutation.mutate({
            id: editingInvoice!.id,
            data: {
              lineItems,
              dueDate: invoiceForm.dueDate,
              subtotal,
              discount: discountAmt,
              tax: taxAmt,
              total,
              currency: activeCurrency,
            },
          })}
          isPending={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* ── Create Modal ── */}
      <Modal isOpen={showModal} onClose={resetModal} title="Create Invoice">
        <InvoiceFormBody
          {...formProps}
          onSubmit={() => createMutation.mutate({
            lineItems,
            dueDate: invoiceForm.dueDate,
            subtotal,
            discount: discountAmt,
            tax: taxAmt,
            total,
            currency: defaultCurrency,
          })}
          isPending={createMutation.isPending}
          submitLabel="Create Invoice"
        />
      </Modal>
    </div>
  );
}

