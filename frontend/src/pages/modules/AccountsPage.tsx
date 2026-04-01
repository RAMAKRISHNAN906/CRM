import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Globe, Phone, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountsService, Account } from '../../services/accounts.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Consulting', 'Media', 'Other',
];

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

const defaultForm: Partial<Account> = {
  name: '', industry: '', size: '', website: '', phone: '',
  city: '', country: '', description: '',
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', page, search],
    queryFn: () => accountsService.getAll({ page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: accountsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowModal(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => accountsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: accountsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedAccount(null);
    },
  });

  const openCreate = () => { setForm(defaultForm); setIsEditing(false); setShowModal(true); };
  const openEdit = (account: Account) => { setForm(account); setIsEditing(true); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedAccount) {
      updateMutation.mutate({ id: selectedAccount.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-white/50 text-sm mt-1">Companies and organizations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Account
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-72"
        />
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
              ))
            : data?.data?.map((account: Account) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card
                    className="cursor-pointer hover:border-violet-500/50 transition-all p-5 border-white/10"
                    onClick={() => setSelectedAccount(account)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">{account.name}</h3>
                        {account.industry && (
                          <p className="text-white/40 text-xs mt-0.5">{account.industry}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      {account.website && (
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Globe className="w-3 h-3" />
                          <span className="truncate">{account.website}</span>
                        </div>
                      )}
                      {account.phone && (
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <Phone className="w-3 h-3" />
                          <span>{account.phone}</span>
                        </div>
                      )}
                      {account.city && (
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <span>📍 {account.city}{account.country ? `, ${account.country}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {account._count && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex gap-4">
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Users className="w-3 h-3" />
                          <span>{account._count.contacts} contacts</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <TrendingUp className="w-3 h-3" />
                          <span>{account._count.deals} deals</span>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {data && data.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-white/50 text-sm self-center">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page >= (data.meta.totalPages || 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Account Detail Modal */}
      {selectedAccount && !showModal && (
        <Modal isOpen onClose={() => setSelectedAccount(null)} title={selectedAccount.name}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedAccount.industry && <div><span className="text-white/40">Industry:</span> <span className="text-white ml-1">{selectedAccount.industry}</span></div>}
              {selectedAccount.size && <div><span className="text-white/40">Size:</span> <span className="text-white ml-1">{selectedAccount.size} employees</span></div>}
              {selectedAccount.website && <div><span className="text-white/40">Website:</span> <span className="text-white ml-1">{selectedAccount.website}</span></div>}
              {selectedAccount.phone && <div><span className="text-white/40">Phone:</span> <span className="text-white ml-1">{selectedAccount.phone}</span></div>}
              {selectedAccount.city && <div><span className="text-white/40">City:</span> <span className="text-white ml-1">{selectedAccount.city}</span></div>}
              {selectedAccount.country && <div><span className="text-white/40">Country:</span> <span className="text-white ml-1">{selectedAccount.country}</span></div>}
            </div>
            {selectedAccount.description && (
              <p className="text-white/60 text-sm">{selectedAccount.description}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => openEdit(selectedAccount)}>Edit</Button>
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={() => deleteMutation.mutate(selectedAccount.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setIsEditing(false); }}
        title={isEditing ? 'Edit Account' : 'New Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Company Name *</label>
            <Input
              value={form.name || ''}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Industry</label>
              <select
                value={form.industry || ''}
                onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Company Size</label>
              <select
                value={form.size || ''}
                onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Select size</option>
                {SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Website</label>
              <Input value={form.website || ''} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Phone</label>
              <Input value={form.phone || ''} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">City</label>
              <Input value={form.city || ''} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Country</label>
              <Input value={form.country || ''} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} placeholder="India" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Company description..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
