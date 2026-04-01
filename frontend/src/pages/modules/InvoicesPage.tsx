import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface LineItem { description: string; quantity: number; unitPrice: number }
interface Invoice {
  id: string; invoiceNumber: string; status: InvoiceStatus;
  currency: string; subtotal: number; tax: number; discount: number; total: number;
  dueDate?: string; paidAt?: string; notes?: string; createdAt: string;
  createdBy?: { name: string }; deal?: { title: string };
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30', icon: FileText },
  SENT: { label: 'Sent', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', icon: Clock },
  PAID: { label: 'Paid', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: CheckCircle },
  OVERDUE: { label: 'Overdue', color: 'text-red-400 bg-red-500/20 border-red-500/30', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500 bg-gray-600/20 border-gray-600/30', icon: FileText },
};

const defaultLineItem: LineItem = { description: '', quantity: 1, unitPrice: 0 };

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...defaultLineItem }]);
  const [invoiceForm, setInvoiceForm] = useState({ notes: '', dueDate: '', tax: 0, discount: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => {
      const res = await api.get(`/invoices?page=${page}&limit=20`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/invoices', data); return res.data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); setShowModal(false); setLineItems([{ ...defaultLineItem }]); },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => api.patch(`/invoices/${id}/status`, { status: 'PAID' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal + Number(invoiceForm.tax) - Number(invoiceForm.discount);

  const updateLineItem = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
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

      {/* Invoice List */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))
            : data?.data?.map((inv: Invoice) => {
                const status = STATUS_CONFIG[inv.status];
                const Icon = status.icon;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="p-4 border-white/10">
                      <div className="flex items-center justify-between gap-4">
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
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                          <span className="text-white font-semibold">
                            ₹{inv.total.toLocaleString('en-IN')}
                          </span>
                          {inv.status === 'SENT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markPaid.mutate(inv.id)}
                              className="text-green-400 hover:text-green-300 text-xs"
                            >
                              Mark Paid
                            </Button>
                          )}
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

      {/* Create Invoice Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice">
        <div className="space-y-4">
          {/* Line items */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Line Items</label>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="w-16"
                    min={1}
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(idx, 'unitPrice', Number(e.target.value))}
                    placeholder="Price"
                    className="w-28"
                    min={0}
                  />
                  {lineItems.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setLineItems(items => items.filter((_, i) => i !== idx))}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-violet-400" onClick={() => setLineItems(items => [...items, { ...defaultLineItem }])}>
              + Add Line
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Tax (₹)</label>
              <Input type="number" value={invoiceForm.tax} onChange={(e) => setInvoiceForm(f => ({ ...f, tax: Number(e.target.value) }))} min={0} />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Discount (₹)</label>
              <Input type="number" value={invoiceForm.discount} onChange={(e) => setInvoiceForm(f => ({ ...f, discount: Number(e.target.value) }))} min={0} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Due Date</label>
            <Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>

          {/* Total preview */}
          <div className="bg-white/5 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-white/50"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-white/50"><span>Tax</span><span>₹{Number(invoiceForm.tax).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-white/50"><span>Discount</span><span>-₹{Number(invoiceForm.discount).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2 mt-2"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ lineItems, ...invoiceForm, tax: Number(invoiceForm.tax), discount: Number(invoiceForm.discount) })}
              disabled={createMutation.isPending || lineItems.every(i => !i.description)}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
