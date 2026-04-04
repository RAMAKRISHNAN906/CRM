import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { Lead } from '../../types';

export const COUNTRIES = [
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'AE', label: '🇦🇪 UAE' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia' },
  { value: 'QA', label: '🇶🇦 Qatar' },
  { value: 'KW', label: '🇰🇼 Kuwait' },
  { value: 'OM', label: '🇴🇲 Oman' },
  { value: 'BH', label: '🇧🇭 Bahrain' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'JP', label: '🇯🇵 Japan' },
  { value: 'CN', label: '🇨🇳 China' },
  { value: 'BR', label: '🇧🇷 Brazil' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'NZ', label: '🇳🇿 New Zealand' },
  { value: 'OTHER', label: '🌍 Other' },
];

const schema = z.object({
  firstName:                z.string().min(1, 'Required'),
  lastName:                 z.string().min(1, 'Required'),
  email:                    z.string().email('Invalid email').optional().or(z.literal('')),
  phone:                    z.string().optional(),
  whatsappNumber:           z.string().optional(),
  company:                  z.string().optional(),
  jobTitle:                 z.string().optional(),
  country:                  z.string().optional(),
  decisionMakerName:        z.string().optional(),
  decisionMakerDesignation: z.string().optional(),
  status: z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST','CONVERTED']).default('NEW'),
  source: z.enum(['WEBSITE','REFERRAL','SOCIAL_MEDIA','EMAIL_CAMPAIGN','COLD_CALL','TRADE_SHOW','OTHER']),
  value:  z.number().min(0).optional(),
  notes:  z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface LeadFormProps {
  defaultValues?: Partial<any>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'NEW',         label: 'New'        },
  { value: 'CONTACTED',   label: 'Contacted'  },
  { value: 'QUALIFIED',   label: 'Qualified'  },
  { value: 'PROPOSAL',    label: 'Proposal'   },
  { value: 'NEGOTIATION', label: 'Negotiation'},
  { value: 'WON',         label: 'Won'        },
  { value: 'LOST',        label: 'Lost'       },
  { value: 'CONVERTED',   label: 'Converted'  },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE',         label: 'Website'        },
  { value: 'REFERRAL',        label: 'Referral'       },
  { value: 'SOCIAL_MEDIA',    label: 'Social Media'   },
  { value: 'EMAIL_CAMPAIGN',  label: 'Email Campaign' },
  { value: 'COLD_CALL',       label: 'Cold Call'      },
  { value: 'TRADE_SHOW',      label: 'Trade Show'     },
  { value: 'OTHER',           label: 'Other'          },
];

const COUNTRY_OPTIONS = [{ value: '', label: 'Select country...' }, ...COUNTRIES];

export const LeadForm: React.FC<LeadFormProps> = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName:                defaultValues?.firstName                || '',
      lastName:                 defaultValues?.lastName                 || '',
      email:                    defaultValues?.email                    || '',
      phone:                    defaultValues?.phone                    || '',
      whatsappNumber:           defaultValues?.whatsappNumber           || '',
      company:                  defaultValues?.company                  || '',
      jobTitle:                 defaultValues?.jobTitle                 || '',
      country:                  defaultValues?.country                  || '',
      decisionMakerName:        defaultValues?.decisionMakerName        || '',
      decisionMakerDesignation: defaultValues?.decisionMakerDesignation || '',
      status: defaultValues?.status || 'NEW',
      source: defaultValues?.source || 'OTHER',
      value:  defaultValues?.value  || 0,
      notes:  defaultValues?.notes  || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First Name *" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last Name *"  required error={errors.lastName?.message}  {...register('lastName')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" type="tel" {...register('phone')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="WhatsApp Number" type="tel" placeholder="+91 98765 43210" {...register('whatsappNumber')} />
        <Input label="Company" {...register('company')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Job Title" {...register('jobTitle')} />
        <Select label="Country" options={COUNTRY_OPTIONS} {...register('country')} />
      </div>

      <div className="rounded-xl border border-border/50 bg-surface-secondary/40 p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Decision Maker</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Name" placeholder="e.g. John Smith" {...register('decisionMakerName')} />
          <Input label="Designation" placeholder="e.g. CEO, Purchase Manager" {...register('decisionMakerDesignation')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
        <Select label="Source" options={SOURCE_OPTIONS} {...register('source')} />
      </div>
      <Input label="Deal Value" type="number" min="0" step="100" {...register('value', { valueAsNumber: true })} />
      <Textarea label="Notes" rows={3} placeholder="Add notes about this lead..." {...register('notes')} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues?.id ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
};
