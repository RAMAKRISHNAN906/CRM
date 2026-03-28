import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Plus, Circle, CheckCircle2, Clock } from 'lucide-react';
import { tasksService } from '../../services/tasks.service';
import { Task } from '../../types';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Modal } from '../../components/ui/Modal';
import { TaskForm } from '../../components/modules/TaskForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-400', MEDIUM: 'text-blue-400', HIGH: 'text-orange-400', URGENT: 'text-red-400',
};

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', page, debouncedSearch],
    queryFn: () => tasksService.getAll({ page, limit: 20, search: debouncedSearch }),
  });

  const createMutation = useMutation({
    mutationFn: tasksService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task created!'); setIsCreateOpen(false); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task updated!'); setEditTask(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update task'),
  });

  const toggleComplete = (task: Task) => {
    updateMutation.mutate({
      id: task.id,
      data: { status: task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED' },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted'); setDeleteTask(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete task'),
  });

  const isOverdue = (task: Task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  const columns: Column<Task>[] = [
    {
      key: 'status',
      header: '',
      width: 'w-12',
      render: (val, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleComplete(row); }}
          className="p-0.5 rounded-full hover:scale-110 transition-transform"
        >
          {val === 'COMPLETED'
            ? <CheckCircle2 size={20} className="text-green-400" />
            : <Circle size={20} className="text-gray-600 hover:text-accent-muted transition-colors" />
          }
        </button>
      ),
    },
    {
      key: 'title',
      header: 'Task',
      render: (val, row) => (
        <div>
          <p className={cn('font-medium', row.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-white')}>
            {val}
          </p>
          {row.description && <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (val) => (
        <span className={cn('text-xs font-semibold uppercase tracking-wider', PRIORITY_COLORS[val])}>
          {val}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <Badge label={val.replace(/_/g, ' ')} status={val} variant="dot" />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (val, row) => {
        const overdue = isOverdue(row);
        return (
          <div className={cn('flex items-center gap-1.5 text-sm', overdue ? 'text-red-400' : 'text-gray-400')}>
            {val && <Clock size={12} />}
            <span>{val ? formatDate(val, 'MMM dd') : '—'}</span>
            {overdue && <span className="text-xs text-red-400 font-medium">Overdue</span>}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (val) => <span className="text-gray-500 text-xs">{formatRelativeTime(val)}</span>,
    },
  ];

  const completedCount = data?.data.filter((t) => t.status === 'COMPLETED').length || 0;
  const overdueCount = data?.data.filter(isOverdue).length || 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.meta?.total || 0} tasks · {completedCount} completed
            {overdueCount > 0 && <span className="text-red-400"> · {overdueCount} overdue</span>}
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
        searchPlaceholder="Search tasks..."
        onEdit={setEditTask}
        onDelete={setDeleteTask}
        emptyTitle="No tasks yet"
        emptySubtitle="Create tasks to stay organized and on track"
        emptyIcon={<CheckSquare size={24} />}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setIsCreateOpen(true)} size="sm">
            Add Task
          </Button>
        }
      />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task" size="md">
        <TaskForm
          onSubmit={(d) => createMutation.mutate(d as any)}
          onCancel={() => setIsCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal isOpen={!!editTask} onClose={() => setEditTask(null)} title="Edit Task" size="md">
        {editTask && (
          <TaskForm
            defaultValues={editTask}
            onSubmit={(d) => updateMutation.mutate({ id: editTask.id, data: d })}
            onCancel={() => setEditTask(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={() => deleteTask && deleteMutation.mutate(deleteTask.id)}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTask?.title}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
