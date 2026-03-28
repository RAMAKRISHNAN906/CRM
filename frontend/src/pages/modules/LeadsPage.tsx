import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Plus } from 'lucide-react';
import { leadsService } from '../../services/leads.service';
import { Lead } from '../../types';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Modal } from '../../components/ui/Modal';
import { LeadForm } from '../../components/modules/LeadForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Avatar } from '../../components/ui/Avatar';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);

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
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (val) => val ? <span className="text-gray-300">{val}</span> : <span className="text-gray-600">—</span>,
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
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
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
    </div>
  );
};
