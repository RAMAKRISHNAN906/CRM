import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Deal } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Required'),
  value: z.number().min(0).optional(),
  stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STAGE_OPTIONS = [
  { value: 'PROSPECTING', label: 'Prospecting' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

const STAGE_PROBABILITY: Record<string, number> = {
  PROSPECTING: 10, QUALIFICATION: 25, PROPOSAL: 50, NEGOTIATION: 75, CLOSED_WON: 100, CLOSED_LOST: 0,
};

interface DealFormProps {
  defaultValues?: Partial<Deal>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DealForm: React.FC<DealFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title || '',
      value: defaultValues?.value || 0,
      stage: defaultValues?.stage || 'PROSPECTING',
      probability: defaultValues?.probability || 10,
      expectedClose: defaultValues?.expectedClose ? defaultValues.expectedClose.split('T')[0] : '',
      notes: defaultValues?.notes || '',
    },
  });

  const stage = watch('stage');
  React.useEffect(() => {
    setValue('probability', STAGE_PROBABILITY[stage] || 10);
  }, [stage, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Deal Title" required error={errors.title?.message} {...register('title')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Deal Value (₹)" type="number" min="0" step="100" {...register('value', { valueAsNumber: true })} />
        <Select label="Stage" options={STAGE_OPTIONS} {...register('stage')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Probability (%)"
          type="number" min="0" max="100"
          {...register('probability', { valueAsNumber: true })}
        />
        <Input label="Expected Close" type="date" {...register('expectedClose')} />
      </div>
      <Textarea label="Notes" rows={3} {...register('notes')} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues?.id ? 'Update Deal' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
};
