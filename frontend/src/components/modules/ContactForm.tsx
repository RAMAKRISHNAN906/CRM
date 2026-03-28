import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Contact } from '../../types';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedin: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContactFormProps {
  defaultValues?: Partial<Contact>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ContactForm: React.FC<ContactFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      email: defaultValues?.email || '',
      phone: defaultValues?.phone || '',
      company: defaultValues?.company || '',
      jobTitle: defaultValues?.jobTitle || '',
      address: defaultValues?.address || '',
      city: defaultValues?.city || '',
      country: defaultValues?.country || '',
      website: defaultValues?.website || '',
      linkedin: defaultValues?.linkedin || '',
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
      <Input label="Address" {...register('address')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="City" {...register('city')} />
        <Input label="Country" {...register('country')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Website" type="url" error={errors.website?.message} {...register('website')} />
        <Input label="LinkedIn" {...register('linkedin')} />
      </div>
      <Textarea label="Notes" rows={3} {...register('notes')} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues?.id ? 'Update Contact' : 'Create Contact'}
        </Button>
      </div>
    </form>
  );
};
