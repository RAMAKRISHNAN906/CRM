import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus } from 'lucide-react';
import { contactsService } from '../../services/contacts.service';
import { Contact } from '../../types';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ContactForm } from '../../components/modules/ContactForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Avatar } from '../../components/ui/Avatar';
import { formatRelativeTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, debouncedSearch],
    queryFn: () => contactsService.getAll({ page, limit: 20, search: debouncedSearch }),
  });

  const createMutation = useMutation({
    mutationFn: contactsService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact created!'); setIsCreateOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create contact'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contactsService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact updated!'); setEditContact(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact deleted'); setDeleteContact(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete contact'),
  });

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
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
      render: (val, row) => (
        <div>
          <p className="text-gray-300">{val || '—'}</p>
          {row.jobTitle && <p className="text-xs text-gray-500">{row.jobTitle}</p>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (val) => val ? <span className="text-gray-300 font-mono text-xs">{val}</span> : <span className="text-gray-600">—</span>,
    },
    {
      key: 'city',
      header: 'Location',
      render: (val, row) => {
        const parts = [val, row.country].filter(Boolean);
        return <span className="text-gray-400 text-sm">{parts.join(', ') || '—'}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (val) => <span className="text-gray-500 text-xs">{formatRelativeTime(val)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.meta?.total || 0} contacts in your database</p>
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
        searchPlaceholder="Search contacts..."
        onEdit={setEditContact}
        onDelete={setDeleteContact}
        emptyTitle="No contacts yet"
        emptySubtitle="Add your first contact to get started"
        emptyIcon={<Users size={24} />}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setIsCreateOpen(true)} size="sm">
            Add Contact
          </Button>
        }
      />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Contact" size="lg">
        <ContactForm
          onSubmit={(d) => createMutation.mutate(d as any)}
          onCancel={() => setIsCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={!!editContact} onClose={() => setEditContact(null)} title="Edit Contact" size="lg">
        {editContact && (
          <ContactForm
            defaultValues={editContact}
            onSubmit={(d) => updateMutation.mutate({ id: editContact.id, data: d })}
            onCancel={() => setEditContact(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onConfirm={() => deleteContact && deleteMutation.mutate(deleteContact.id)}
        title="Delete Contact"
        message={`Are you sure you want to delete ${deleteContact?.firstName} ${deleteContact?.lastName}?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
