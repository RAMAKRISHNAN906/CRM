import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Task } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface TaskFormProps {
  defaultValues?: Partial<Task>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      priority: defaultValues?.priority || 'MEDIUM',
      status: defaultValues?.status || 'TODO',
      dueDate: defaultValues?.dueDate ? defaultValues.dueDate.split('T')[0] : '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Task Title" required error={errors.title?.message} {...register('title')} />
      <Textarea label="Description" rows={3} placeholder="Describe the task..." {...register('description')} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Priority" options={PRIORITY_OPTIONS} {...register('priority')} />
        <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
      </div>
      <Input label="Due Date" type="date" {...register('dueDate')} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues?.id ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};
