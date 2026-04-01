import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Zap, Play, Pause, Trash2, Activity, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { ApiResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  isActive: boolean;
  runCount: number;
  createdAt: string;
  _count?: { logs: number };
}

const TRIGGERS = [
  { value: 'LEAD_CREATED', label: 'Lead Created' },
  { value: 'LEAD_STATUS_CHANGED', label: 'Lead Status Changed' },
  { value: 'DEAL_CREATED', label: 'Deal Created' },
  { value: 'DEAL_STAGE_CHANGED', label: 'Deal Stage Changed' },
  { value: 'TASK_OVERDUE', label: 'Task Overdue' },
  { value: 'TICKET_CREATED', label: 'Ticket Created' },
  { value: 'CONTACT_CREATED', label: 'Contact Created' },
];

const defaultForm = { name: '', description: '', trigger: 'LEAD_CREATED', conditions: '[]', actions: '[]' };

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState('');

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Workflow[]>>('/automation');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/automation', data);
      return res.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); setShowModal(false); setForm(defaultForm); },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/automation/${id}/toggle`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/automation/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const conditions = JSON.parse(form.conditions);
      const actions = JSON.parse(form.actions);
      createMutation.mutate({ name: form.name, description: form.description, trigger: form.trigger, conditions, actions });
    } catch {
      setFormError('Conditions and Actions must be valid JSON arrays.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automation</h1>
          <p className="text-white/50 text-sm mt-1">IF/THEN workflows that run automatically</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Workflow
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-violet-500/30 bg-violet-500/10 p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-violet-400 shrink-0" />
          <p className="text-violet-300 text-sm">
            Workflows fire automatically when a trigger event occurs. Each workflow checks conditions, then runs actions like creating tasks, sending notifications, or assigning users.
          </p>
        </div>
      </Card>

      {/* Workflow List */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
              ))
            : workflows?.map((wf: Workflow) => (
                <motion.div
                  key={wf.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className={`border-white/10 p-4 ${!wf.isActive ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${wf.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <div className="min-w-0">
                          <h3 className="text-white font-medium truncate">{wf.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full">
                              {TRIGGERS.find(t => t.value === wf.trigger)?.label || wf.trigger}
                            </span>
                            <span className="text-xs text-white/40 flex items-center gap-1">
                              <Activity className="w-3 h-3" /> {wf.runCount} runs
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate(wf.id)}
                          title={wf.isActive ? 'Pause' : 'Activate'}
                        >
                          {wf.isActive ? <Pause className="w-4 h-4 text-yellow-400" /> : <Play className="w-4 h-4 text-green-400" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(wf.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
        </AnimatePresence>
        {!isLoading && (!workflows || workflows.length === 0) && (
          <div className="text-center py-16 text-white/30">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No workflows yet. Create your first automation.</p>
          </div>
        )}
      </div>

      {/* Create Workflow Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Workflow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Name *</label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Assign new lead to sales rep" required />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Trigger *</label>
            <select
              value={form.trigger}
              onChange={(e) => setForm(f => ({ ...f, trigger: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            >
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">
              Conditions <span className="text-white/30">(JSON array — empty = always run)</span>
            </label>
            <textarea
              value={form.conditions}
              onChange={(e) => setForm(f => ({ ...f, conditions: e.target.value }))}
              rows={3}
              placeholder='[{"field":"status","operator":"equals","value":"NEW"}]'
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">
              Actions <span className="text-white/30">(JSON array)</span>
            </label>
            <textarea
              value={form.actions}
              onChange={(e) => setForm(f => ({ ...f, actions: e.target.value }))}
              rows={4}
              placeholder='[{"type":"CREATE_NOTIFICATION","config":{"title":"New lead!","body":"A new lead was created"}}]'
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          {/* Quick action templates */}
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-white/40 mb-2">Action templates:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Create Task', json: '[{"type":"CREATE_TASK","config":{"title":"Follow up","priority":"HIGH","dueDays":1}}]' },
                { label: 'Notify User', json: '[{"type":"CREATE_NOTIFICATION","config":{"title":"Alert","body":"Action required"}}]' },
                { label: 'Send Webhook', json: '[{"type":"SEND_WEBHOOK","config":{"url":"https://your-endpoint.com/hook"}}]' },
              ].map(t => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, actions: t.json }))}
                  className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/30 px-2 py-1 rounded-full hover:bg-violet-500/20 transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
