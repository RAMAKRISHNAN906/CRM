import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus } from 'lucide-react';
import { dealsService } from '../../services/deals.service';
import { Deal } from '../../types';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Modal } from '../../components/ui/Modal';
import { DealForm } from '../../components/modules/DealForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency, formatDate, stageProgressMap } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export const DealsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['deals', page, debouncedSearch],
    queryFn: () => dealsService.getAll({ page, limit: 20, search: debouncedSearch }),
  });

  const createMutation = useMutation({
    mutationFn: dealsService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); toast.success('Deal created!'); setIsCreateOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create deal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dealsService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); toast.success('Deal updated!'); setEditDeal(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update deal'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); toast.success('Deal deleted'); setDeleteDeal(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete deal'),
  });

  const columns: Column<Deal>[] = [
    {
      key: 'title',
      header: 'Deal',
      render: (val, row) => (
        <div>
          <p className="font-medium text-white">{val}</p>
          {row.contact && <p className="text-xs text-gray-500">{row.contact.firstName} {row.contact.lastName} · {row.contact.company}</p>}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      render: (val) => <span className="font-semibold text-green-400">{formatCurrency(val || 0)}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      sortable: true,
      render: (val) => (
        <div className="space-y-1.5">
          <Badge label={val.replace(/_/g, ' ')} status={val} variant="dot" />
          <div className="w-24 h-1 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', val === 'CLOSED_WON' ? 'bg-green-500' : val === 'CLOSED_LOST' ? 'bg-red-500' : 'bg-accent')}
              style={{ width: `${stageProgressMap[val] || 0}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'probability',
      header: 'Prob.',
      render: (val) => <span className="text-gray-300">{val}%</span>,
    },
    {
      key: 'expectedClose',
      header: 'Close Date',
      render: (val) => <span className="text-gray-400 text-sm">{formatDate(val)}</span>,
    },
  ];

  const totalValue = data?.data.reduce((sum, d) => sum + d.value, 0) || 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Deals</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.meta?.total || 0} deals · Total pipeline: <span className="text-green-400 font-medium">{formatCurrency(totalValue)}</span>
          </p>
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
        searchPlaceholder="Search deals..."
        onEdit={setEditDeal}
        onDelete={setDeleteDeal}
        emptyTitle="No deals yet"
        emptySubtitle="Create your first deal to start tracking revenue"
        emptyIcon={<DollarSign size={24} />}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setIsCreateOpen(true)} size="sm">
            Add Deal
          </Button>
        }
      />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Deal" size="md">
        <DealForm
          onSubmit={(d) => createMutation.mutate(d as any)}
          onCancel={() => setIsCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={!!editDeal} onClose={() => setEditDeal(null)} title="Edit Deal" size="md">
        {editDeal && (
          <DealForm
            defaultValues={editDeal}
            onSubmit={(d) => updateMutation.mutate({ id: editDeal.id, data: d })}
            onCancel={() => setEditDeal(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDeal}
        onClose={() => setDeleteDeal(null)}
        onConfirm={() => deleteDeal && deleteMutation.mutate(deleteDeal.id)}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deleteDeal?.title}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
