import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Lead } from '../../types';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']),
  source: z.enum(['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'COLD_CALL', 'TRADE_SHOW', 'OTHER']),
  value: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface LeadFormProps {
  defaultValues?: Partial<Lead>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'OTHER', label: 'Other' },
];

export const LeadForm: React.FC<LeadFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
      company: defaultValues?.company || '',
      jobTitle: defaultValues?.jobTitle || '',
      status: defaultValues?.status || 'NEW',
      source: defaultValues?.source || 'OTHER',
      value: defaultValues?.value || 0,
      notes: defaultValues?.notes || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First Name" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last Name" required error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" type="tel" {...register('phone')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Company" {...register('company')} />
        <Input label="Job Title" {...register('jobTitle')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
        <Select label="Source" options={SOURCE_OPTIONS} {...register('source')} />
      </div>
      <Input
        label="Deal Value (₹)"
        type="number"
        min="0"
        step="100"
        {...register('value', { valueAsNumber: true })}
      />
      <Textarea label="Notes" rows={3} placeholder="Add any notes about this lead..." {...register('notes')} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues?.id ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
};
