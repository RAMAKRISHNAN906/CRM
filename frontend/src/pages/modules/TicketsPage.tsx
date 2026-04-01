import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Ticket, AlertCircle, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ticketsService, Ticket as ITicket, TicketStatus, TicketPriority } from '../../services/tickets.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Open', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Ticket },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  WAITING_ON_CUSTOMER: { label: 'Waiting', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
  RESOLVED: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  CLOSED: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  HIGH: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  CRITICAL: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const defaultForm = { subject: '', description: '', priority: 'MEDIUM' as TicketPriority };

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', page, search, statusFilter, priorityFilter],
    queryFn: () => ticketsService.getAll({
      page, limit: 20, search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: ticketsService.getStats,
  });

  const createMutation = useMutation({
    mutationFn: ticketsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
      setShowModal(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ITicket> }) =>
      ticketsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats'] });
    },
  });

  const isSlaOverdue = (ticket: ITicket) =>
    ticket.slaDeadline &&
    !['RESOLVED', 'CLOSED'].includes(ticket.status) &&
    new Date(ticket.slaDeadline) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-white/50 text-sm mt-1">Manage customer support requests and SLAs</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'SLA Overdue', value: stats.overdueSla, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map((s) => (
            <Card key={s.label} className={`${s.bg} border-white/10 p-4`}>
              <p className="text-white/50 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))
            : data?.data?.map((ticket: ITicket) => {
                const status = STATUS_CONFIG[ticket.status];
                const priority = PRIORITY_CONFIG[ticket.priority];
                const overdue = isSlaOverdue(ticket);

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`cursor-pointer bg-white/5 border rounded-xl p-4 hover:bg-white/10 transition-all ${
                      overdue ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-medium truncate">{ticket.subject}</h3>
                          {overdue && (
                            <span className="flex items-center gap-1 text-xs text-red-400">
                              <AlertCircle className="w-3 h-3" /> SLA Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm mt-1 line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {ticket.contact && (
                            <span className="text-white/40 text-xs">
                              {ticket.contact.firstName} {ticket.contact.lastName}
                            </span>
                          )}
                          {ticket.assignee && (
                            <span className="text-white/40 text-xs">→ {ticket.assignee.name}</span>
                          )}
                          <span className="text-white/30 text-xs">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {data && data.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-white/50 text-sm self-center">
            Page {page} of {data.meta.totalPages}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= (data.meta.totalPages || 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Ticket">
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form as any); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-white/70 mb-1">Subject *</label>
            <Input
              value={form.subject}
              onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Brief description of the issue"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Full details of the issue..."
              required
              rows={4}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={selectedTicket.subject}
        >
          <div className="space-y-4">
            <p className="text-white/70 text-sm">{selectedTicket.description}</p>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_CONFIG[selectedTicket.status].color}`}>
                {STATUS_CONFIG[selectedTicket.status].label}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_CONFIG[selectedTicket.priority].color}`}>
                {PRIORITY_CONFIG[selectedTicket.priority].label}
              </span>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Update Status</label>
              <select
                defaultValue={selectedTicket.status}
                onChange={(e) => {
                  updateMutation.mutate({ id: selectedTicket.id, data: { status: e.target.value as TicketStatus } });
                  setSelectedTicket(t => t ? { ...t, status: e.target.value as TicketStatus } : null);
                }}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {selectedTicket.slaDeadline && (
              <p className={`text-sm ${isSlaOverdue(selectedTicket) ? 'text-red-400' : 'text-white/50'}`}>
                SLA Deadline: {new Date(selectedTicket.slaDeadline).toLocaleString()}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
