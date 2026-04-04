import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Plus, Lightbulb, X, Globe, User, Flag } from 'lucide-react';
import { leadsService } from '../../services/leads.service';
import api from '../../services/api';
import { Lead } from '../../types';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Modal } from '../../components/ui/Modal';
import { LeadForm, COUNTRIES } from '../../components/modules/LeadForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Avatar } from '../../components/ui/Avatar';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.value, c.label]));
const FLAG_MAP: Record<string, string> = {
  IN:'🇮🇳',US:'🇺🇸',AE:'🇦🇪',GB:'🇬🇧',AU:'🇦🇺',CA:'🇨🇦',SA:'🇸🇦',
  QA:'🇶🇦',KW:'🇰🇼',OM:'🇴🇲',BH:'🇧🇭',DE:'🇩🇪',FR:'🇫🇷',SG:'🇸🇬',
  JP:'🇯🇵',CN:'🇨🇳',BR:'🇧🇷',ZA:'🇿🇦',NG:'🇳🇬',NZ:'🇳🇿',
};

export const LeadsPage: React.FC = () => {
  const queryClient  = useQueryClient();
  const navigate     = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState('');
  const [sortBy, setSortBy]               = useState('createdAt');
  const [sortOrder, setSortOrder]         = useState<'asc' | 'desc'>('desc');
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [editLead, setEditLead]           = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead]       = useState<Lead | null>(null);
  const [convertLead, setConvertLead]     = useState<Lead | null>(null);
  const [convertForm, setConvertForm]     = useState({ title: '', value: '', closeDate: '', probability: '20', notes: '' });

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, debouncedSearch, sortBy, sortOrder],
    queryFn: () => leadsService.getAll({ page, limit: 20, search: debouncedSearch, sortBy, sortOrder }),
  });

  const createMutation = useMutation({
    mutationFn: leadsService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead created!'); setIsCreateOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create lead'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leadsService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead updated!'); setEditLead(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update lead'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead deleted'); setDeleteLead(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete lead'),
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/leads/${id}/convert-to-opportunity`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Lead converted to Opportunity!');
      setConvertLead(null);
      navigate('/opportunities');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Conversion failed'),
  });

  const openConvert = (lead: Lead) => {
    setConvertLead(lead);
    setConvertForm({
      title: `${lead.firstName} ${lead.lastName}${lead.company ? ` — ${lead.company}` : ''}`,
      value: String((lead as any).value || ''),
      closeDate: '',
      probability: '20',
      notes: '',
    });
  };

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertLead) return;
    convertMutation.mutate({
      id: convertLead.id,
      data: {
        title:       convertForm.title,
        value:       parseFloat(convertForm.value) || 0,
        closeDate:   convertForm.closeDate || undefined,
        probability: parseInt(convertForm.probability) || 20,
        notes:       convertForm.notes || undefined,
      },
    });
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-white">{row.firstName} {row.lastName}</p>
            {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
            {(row as any).decisionMakerName && (
              <p className="text-xs text-violet-400">
                <User size={10} className="inline mr-1" />
                {(row as any).decisionMakerName}
                {(row as any).decisionMakerDesignation && ` · ${(row as any).decisionMakerDesignation}`}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company / Country',
      render: (val, row) => (
        <div>
          {val ? <p className="text-gray-300 text-sm">{val}</p> : null}
          {(row as any).country && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>{FLAG_MAP[(row as any).country] || '🌍'}</span>
              {COUNTRY_MAP[(row as any).country] || (row as any).country}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (val) => <Badge label={val} status={val} variant="dot" />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (val) => <Badge label={val?.replace(/_/g, ' ')} />,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (val) => val ? <span className="font-medium text-green-400">{formatCurrency(val)}</span> : <span className="text-gray-600">—</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (val) => <span className="text-gray-500 text-xs">{formatRelativeTime(val)}</span>,
    },
    {
      key: 'id',
      header: 'Convert',
      render: (_, row) => {
        const alreadyConverted = !!(row as any).convertedToOpportunityId;
        return alreadyConverted ? (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <Lightbulb size={11} /> Converted
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); openConvert(row); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
          >
            <Lightbulb size={11} /> To Opportunity
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.meta?.total || 0} total leads in your pipeline</p>
        </div>
      </motion.div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        total={data?.meta?.total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder="Search leads..."
        onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
        onEdit={setEditLead}
        onDelete={setDeleteLead}
        emptyTitle="No leads yet"
        emptySubtitle="Start adding leads to your CRM"
        emptyIcon={<UserPlus size={24} />}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setIsCreateOpen(true)} size="sm">
            Add Lead
          </Button>
        }
      />

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Lead" size="lg">
        <LeadForm
          onSubmit={(d) => createMutation.mutate(d as any)}
          onCancel={() => setIsCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editLead} onClose={() => setEditLead(null)} title="Edit Lead" size="lg">
        {editLead && (
          <LeadForm
            defaultValues={editLead}
            onSubmit={(d) => updateMutation.mutate({ id: editLead.id, data: d })}
            onCancel={() => setEditLead(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteLead}
        onClose={() => setDeleteLead(null)}
        onConfirm={() => deleteLead && deleteMutation.mutate(deleteLead.id)}
        title="Delete Lead"
        message={`Are you sure you want to delete ${deleteLead?.firstName} ${deleteLead?.lastName}? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />

      {/* Convert to Opportunity Modal */}
      <AnimatePresence>
        {convertLead && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConvertLead(null)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-surface-elevated border border-border rounded-2xl w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Lightbulb size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Convert to Opportunity</p>
                    <p className="text-xs text-gray-500">{convertLead.firstName} {convertLead.lastName}</p>
                  </div>
                </div>
                <button onClick={() => setConvertLead(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConvert} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Opportunity Title *</label>
                  <Input value={convertForm.title}
                    onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })}
                    placeholder="e.g. Enterprise CRM Deal — Acme Corp" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Value</label>
                    <Input type="number" value={convertForm.value} min={0}
                      onChange={(e) => setConvertForm({ ...convertForm, value: e.target.value })}
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Probability %</label>
                    <Input type="number" value={convertForm.probability} min={0} max={100}
                      onChange={(e) => setConvertForm({ ...convertForm, probability: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expected Close Date</label>
                  <Input type="date" value={convertForm.closeDate}
                    onChange={(e) => setConvertForm({ ...convertForm, closeDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <textarea rows={2} value={convertForm.notes}
                    onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                    placeholder="Initial notes for this opportunity..."
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent resize-none" />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button type="button" variant="ghost" onClick={() => setConvertLead(null)}>Cancel</Button>
                  <Button type="submit" disabled={convertMutation.isPending}>
                    {convertMutation.isPending ? 'Converting...' : 'Convert to Opportunity'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
