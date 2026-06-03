import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Lead, LeadStatus, ProductFlat, User } from '../../types';
import { leadsService } from '../../services/leads.service';
import type { LeadProductSuggestion } from '../../services/leads.service';
import { settingsProductsService } from '../../services/settingsProducts.service';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { LEAD_STATUS_OPTIONS, coerceLeadStatus } from '../../utils/leadStatus';

export const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'AE', label: 'UAE' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'QA', label: 'Qatar' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'OM', label: 'Oman' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'SG', label: 'Singapore' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'BR', label: 'Brazil' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'OTHER', label: 'Other' },
];

const LEAD_STATUS_VALUES = LEAD_STATUS_OPTIONS.map((option) => option.value) as [LeadStatus, ...LeadStatus[]];

const LEAD_SOURCE_VALUES = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'COLD_CALL', 'TRADE_SHOW', 'OTHER'] as const;
const ASSIGNMENT_ROLE_VALUES = ['SALES_PERSON', 'SALES_INCHARGE', 'SALES_HEAD'] as const;
const WIZARD_STEPS = [
  { step: 1, label: 'Basic Info', hint: 'Contact and lead details' },
  { step: 2, label: 'Category', hint: 'Choose the product category' },
  { step: 3, label: 'Group', hint: 'Filter groups by category' },
  { step: 4, label: 'Product', hint: 'Pick the exact product' },
  { step: 5, label: 'Amount', hint: 'Auto-filled, editable' },
  { step: 6, label: 'Assignment', hint: 'Choose the correct sales hierarchy' },
  { step: 7, label: 'Review', hint: 'Confirm and save' },
] as const;

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  country: z.string().optional(),
  decisionMakerName: z.string().optional(),
  decisionMakerDesignation: z.string().optional(),
  status: z.enum(LEAD_STATUS_VALUES).default('COLD'),
  source: z.enum(LEAD_SOURCE_VALUES).default('OTHER'),
  value: z.preprocess(
    (input) => {
      if (input === '' || input === null || input === undefined) return undefined;
      const parsed = typeof input === 'string' ? Number(input) : Number(input);
      if (!Number.isFinite(parsed)) return undefined;
      return parsed;
    },
    z.number().positive('Expected amount is required')
  ),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  assigneeId: z.string().optional(),
});

type LeadFormValues = z.infer<typeof schema> & {
  productIds?: number[];
  selectedProducts?: ProductFlat[];
  areaManagerId?: string;
  salesHeadId?: string;
};

type AssignmentRole = (typeof ASSIGNMENT_ROLE_VALUES)[number];

const normalizeAssignmentRole = (role?: string | null): AssignmentRole | null => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'AREA_MANAGER') return 'SALES_INCHARGE';
  if (ASSIGNMENT_ROLE_VALUES.includes(normalized as AssignmentRole)) return normalized as AssignmentRole;
  return null;
};

const deriveInitialAssignmentRole = (
  lead?: Partial<Lead>,
  currentUser?: Pick<User, 'id' | 'name' | 'role' | 'avatar'> | null,
): AssignmentRole => {
  if ((lead as any)?.salesHeadId || (lead as any)?.salesHead?.id) return 'SALES_HEAD';
  if ((lead as any)?.salesInchargeId || (lead as any)?.areaManagerId || (lead as any)?.salesIncharge?.id) {
    return 'SALES_INCHARGE';
  }

  const currentRole = normalizeAssignmentRole(currentUser?.role);
  if (currentRole) return currentRole;
  return 'SALES_PERSON';
};

const deriveInitialAssigneeId = (
  lead?: Partial<Lead>,
  currentUser?: Pick<User, 'id' | 'name' | 'role' | 'avatar'> | null,
  role?: AssignmentRole,
): string => {
  if (role === 'SALES_HEAD') {
    return String((lead as any)?.salesHeadId || (lead as any)?.salesHead?.id || currentUser?.id || '');
  }
  if (role === 'SALES_INCHARGE') {
    return String((lead as any)?.salesInchargeId || (lead as any)?.areaManagerId || (lead as any)?.salesIncharge?.id || currentUser?.id || '');
  }
  return String((lead as any)?.salesPersonId || (lead as any)?.assigneeId || (lead as any)?.salesPerson?.id || currentUser?.id || '');
};

const formatAssignmentRoleLabel = (role: AssignmentRole): string => {
  switch (role) {
    case 'SALES_INCHARGE':
      return 'Sales Incharge';
    case 'SALES_HEAD':
      return 'Sales Head';
    case 'SALES_PERSON':
    default:
      return 'Sales Person';
  }
};

interface LeadFormProps {
  defaultValues?: Partial<Lead>;
  onSubmit: (data: LeadFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  salesPeople?: Array<Pick<User, 'id' | 'name' | 'role' | 'avatar'>>;
  salesInchargeUsers?: Array<Pick<User, 'id' | 'name' | 'role' | 'avatar'>>;
  salesHeadUsers?: Array<Pick<User, 'id' | 'name' | 'role' | 'avatar'>>;
  currentUser?: Pick<User, 'id' | 'name' | 'role' | 'avatar'> | null;
}

const COUNTRY_OPTIONS = [{ value: '', label: 'Select country...' }, ...COUNTRIES];

const formatAmount = (value: number) => formatCurrency(value, undefined, { notation: 'standard', maximumFractionDigits: 0 });

export const LeadForm: React.FC<LeadFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  salesPeople = [],
  salesInchargeUsers = [],
  salesHeadUsers = [],
  currentUser,
}) => {
  const { data: settingsProducts } = useQuery({
    queryKey: ['settings-products'],
    queryFn: settingsProductsService.get,
  });

  const catalogCategories = useMemo(() => settingsProducts?.categories || [], [settingsProducts]);
  const allProducts = useMemo(() => settingsProducts?.products || [], [settingsProducts]);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stepError, setStepError] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<AssignmentRole>(() => deriveInitialAssignmentRole(defaultValues, currentUser));
  const seededRef = useRef<string | null>(null);

  const seededProduct = useMemo(() => {
    const raw = (defaultValues as any)?.selectedProducts?.[0];
    if (!raw) return null;

    const id = Number(raw.id);
    if (!Number.isFinite(id)) return null;

    const matched = allProducts.find((product) => product.id === id);
    const category = String(raw.category || matched?.category || '');
    const group = String(raw.group || raw.group_name || matched?.group || '');
    const name = String(raw.name || matched?.name || '');
    const rawValue = Number.isFinite(Number((defaultValues as any)?.value))
      ? Number((defaultValues as any)?.value)
      : Number(raw.value ?? matched?.value ?? 0);
    const value = Number.isFinite(rawValue) ? rawValue : 0;

    if (!category || !group || !name) return null;
    return { id, category, group, name, value };
  }, [allProducts, defaultValues]);

  const initialAssignmentRole = useMemo(
    () => deriveInitialAssignmentRole(defaultValues, currentUser),
    [defaultValues, currentUser]
  );
  const initialAssigneeId = useMemo(
    () => deriveInitialAssigneeId(defaultValues, currentUser, initialAssignmentRole),
    [defaultValues, currentUser, initialAssignmentRole]
  );
  const { data: productSuggestions = [], isFetching: isLoadingProductSuggestions } = useQuery<LeadProductSuggestion[]>({
    queryKey: ['lead-product-suggestions', selectedCategory, selectedGroup],
    queryFn: () => leadsService.getProductSuggestions({
      category: selectedCategory,
      group: selectedGroup,
      limit: 6,
      excludeLeadId: (defaultValues as any)?.id,
    }),
    enabled: step === 4 && Boolean(selectedCategory && selectedGroup),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: (defaultValues as any)?.firstName || '',
      lastName: (defaultValues as any)?.lastName || '',
      email: (defaultValues as any)?.email || '',
      phone: (defaultValues as any)?.phone || '',
      whatsappNumber: (defaultValues as any)?.whatsappNumber || '',
      company: (defaultValues as any)?.company || '',
      jobTitle: (defaultValues as any)?.jobTitle || '',
      country: (defaultValues as any)?.country || '',
      decisionMakerName: (defaultValues as any)?.decisionMakerName || '',
      decisionMakerDesignation: (defaultValues as any)?.decisionMakerDesignation || '',
      status: coerceLeadStatus((defaultValues as any)?.status),
      source: (defaultValues as any)?.source || 'OTHER',
      value: (defaultValues as any)?.value ?? undefined,
      followUpDate: (defaultValues as any)?.followUpDate ? String((defaultValues as any).followUpDate).slice(0, 10) : '',
      notes: (defaultValues as any)?.notes || '',
      assigneeId: (defaultValues as any)?.assigneeId || initialAssigneeId || '',
    },
  });

  useEffect(() => {
    if (!seededProduct) return;
    const seedKey = `${(defaultValues as any)?.id ?? 'new'}:${seededProduct.id}`;
    if (seededRef.current === seedKey) return;

    setSelectedCategory(seededProduct.category);
    setSelectedGroup(seededProduct.group);
    setSelectedProductId(String(seededProduct.id));
    setValue('value', seededProduct.value, { shouldDirty: false, shouldValidate: false });
    seededRef.current = seedKey;
  }, [defaultValues, seededProduct, setValue]);

  const selectedCategoryData = useMemo(
    () => catalogCategories.find((category) => category.name === selectedCategory) || null,
    [catalogCategories, selectedCategory]
  );
  const selectedGroupData = useMemo(
    () => selectedCategoryData?.groups.find((group) => group.name === selectedGroup) || null,
    [selectedCategoryData, selectedGroup]
  );
  const filteredGroups = selectedCategoryData?.groups || [];
  const filteredProducts = selectedGroupData?.products || [];
  const selectedProduct = useMemo(
    () => allProducts.find((product) => String(product.id) === selectedProductId) || null,
    [allProducts, selectedProductId]
  );
  const watchedAmount = watch('value');
  const amountValue = useMemo(() => {
    const parsed = typeof watchedAmount === 'number' ? watchedAmount : Number(watchedAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [watchedAmount]);
  const assigneeId = watch('assigneeId');
  const assignmentRoleLabel = useMemo(
    () => formatAssignmentRoleLabel(assignmentRole),
    [assignmentRole]
  );
  const availableAssignmentUsers = useMemo(() => {
    const roleMap: Record<AssignmentRole, Array<Pick<User, 'id' | 'name' | 'role' | 'avatar'>>> = {
      SALES_PERSON: salesPeople,
      SALES_INCHARGE: salesInchargeUsers,
      SALES_HEAD: salesHeadUsers,
    };
    const items = [...(roleMap[assignmentRole] || [])];
    const currentUserRole = normalizeAssignmentRole(currentUser?.role);
    if (currentUser && currentUserRole === assignmentRole && !items.some((user) => String(user.id) === String(currentUser.id))) {
      items.unshift(currentUser);
    }
    if (!items.length && currentUser && currentUserRole === assignmentRole) {
      items.push(currentUser);
    }

    const seen = new Set<string>();
    return items.filter((user) => {
      const id = String(user.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [assignmentRole, salesPeople, salesInchargeUsers, salesHeadUsers, currentUser]);

  useEffect(() => {
    const nextRole = deriveInitialAssignmentRole(defaultValues, currentUser);
    const nextAssigneeId = deriveInitialAssigneeId(defaultValues, currentUser, nextRole);
    setAssignmentRole(nextRole);
    setValue('assigneeId', nextAssigneeId, { shouldDirty: false, shouldValidate: false });
  }, [defaultValues, currentUser, setValue]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: catalogCategories.length ? 'Select category...' : 'No categories configured' },
      ...catalogCategories.map((category) => ({
        value: category.name,
        label: `${category.name}${category.groups.length ? ` (${category.groups.length})` : ''}`,
      })),
    ],
    [catalogCategories]
  );

  const groupOptions = useMemo(
    () => [
      { value: '', label: selectedCategory ? 'Select group...' : 'Select a category first' },
      ...filteredGroups.map((group) => ({
        value: group.name,
        label: `${group.name}${group.products.length ? ` (${group.products.length})` : ''}`,
      })),
    ],
    [filteredGroups, selectedCategory]
  );

  const productOptions = useMemo(
    () => [
      { value: '', label: selectedGroup ? 'Select product...' : 'Select a group first' },
      ...filteredProducts.map((product) => ({
        value: String(product.id),
        label: `${product.name} - ${formatAmount(Number(product.value || 0))}`,
      })),
    ],
    [filteredProducts, selectedGroup]
  );

  const assignmentRoleOptions = useMemo(
    () => ASSIGNMENT_ROLE_VALUES.map((value) => ({
      value,
      label: formatAssignmentRoleLabel(value),
    })),
    []
  );

  const assigneeOptions = useMemo(
    () => [
      {
        value: '',
        label: availableAssignmentUsers.length ? `Select ${assignmentRoleLabel.toLowerCase()}...` : `No ${assignmentRoleLabel.toLowerCase()} available`,
      },
      ...availableAssignmentUsers.map((user) => ({
        value: String(user.id),
        label: `${user.name}${user.role ? ` (${user.role})` : ''}`,
      })),
    ],
    [availableAssignmentUsers, assignmentRoleLabel]
  );

  const resetSelectionError = () => setStepError('');

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedGroup('');
    setSelectedProductId('');
    setValue('value', undefined as any, { shouldDirty: true, shouldValidate: false });
    resetSelectionError();
  };

  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setSelectedProductId('');
    setValue('value', undefined as any, { shouldDirty: true, shouldValidate: false });
    resetSelectionError();
  };

  const handleProductChange = (value: string) => {
    setSelectedProductId(value);
    const product = filteredProducts.find((item) => String(item.id) === value)
      || allProducts.find((item) => String(item.id) === value)
      || null;
    if (product) {
      setValue('value', Number(product.value || 0), { shouldDirty: true, shouldValidate: true });
    }
    resetSelectionError();
  };

  const handleAssignmentRoleChange = (value: string) => {
    const nextRole = (ASSIGNMENT_ROLE_VALUES.includes(value as AssignmentRole) ? value : 'SALES_PERSON') as AssignmentRole;
    setAssignmentRole(nextRole);

    const currentUserRole = normalizeAssignmentRole(currentUser?.role);
    const nextAssigneeId = currentUser && currentUserRole === nextRole ? String(currentUser.id) : '';
    setValue('assigneeId', nextAssigneeId, { shouldDirty: true, shouldValidate: false });
    resetSelectionError();
  };

  const validateStep = async (nextStep: number) => {
    if (nextStep === 2) {
      const valid = await trigger([
        'firstName',
        'lastName',
        'email',
        'phone',
        'whatsappNumber',
        'company',
        'jobTitle',
        'country',
        'decisionMakerName',
        'decisionMakerDesignation',
        'status',
        'source',
        'notes',
        'followUpDate',
      ]);
      if (!valid) return false;
    }
    if (nextStep === 3 && !selectedCategory) {
      setStepError('Select a category');
      return false;
    }
    if (nextStep === 4 && !selectedGroup) {
      setStepError('Select a group');
      return false;
    }
    if (nextStep === 5 && !selectedProductId) {
      setStepError('Select a product');
      return false;
    }
    if (nextStep === 6) {
      const valid = await trigger('value');
      if (!valid) return false;
    }
    if (nextStep === 7) {
      const valid = await trigger('assigneeId');
      if (!valid) return false;
    }
    return true;
  };

  const goNext = async () => {
    setStepError('');
    const nextStep = Math.min(step + 1, 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const valid = await validateStep(nextStep);
    if (!valid) return;
    setStep(nextStep);
  };

  const goBack = () => {
    setStepError('');
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
  };

  const handleFormSubmit = (data: LeadFormValues) => {
    const product = selectedProduct || allProducts.find((item) => String(item.id) === selectedProductId) || null;
    if (!product) {
      setStep(4);
      setStepError('Select a product');
      return;
    }

    const { assigneeId: rawAssigneeId, ...rest } = data;
    const selectedAssigneeId = String(rawAssigneeId || '').trim();
    const assignmentPayload =
      assignmentRole === 'SALES_HEAD'
        ? { salesHeadId: selectedAssigneeId }
        : assignmentRole === 'SALES_INCHARGE'
          ? { areaManagerId: selectedAssigneeId }
          : { assigneeId: selectedAssigneeId };
    const finalAmount = Number.isFinite(amountValue) && amountValue > 0 ? amountValue : Number(product.value || 0);
    onSubmit({
      ...rest,
      ...assignmentPayload,
      value: finalAmount,
      productIds: [product.id],
      selectedProducts: [
        {
          id: product.id,
          category: product.category,
          group: product.group,
          name: product.name,
          value: finalAmount,
          quantity: 1,
        },
      ],
    } as LeadFormValues);
  };

  const currentStepMeta = WIZARD_STEPS.find((item) => item.step === step) || WIZARD_STEPS[0];
  const reviewAssignee = availableAssignmentUsers.find((user) => String(user.id) === String(assigneeId || '')) || null;
  const reviewAmount = amountValue > 0 ? amountValue : Number(selectedProduct?.value || 0);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="rounded-2xl border border-border/60 bg-surface-elevated/70 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Lead creation wizard</p>
            <h3 className="text-xl font-semibold text-white">Step {step} of 7</h3>
            <p className="text-sm text-gray-400">{currentStepMeta.label} - {currentStepMeta.hint}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-secondary px-3 py-2 text-xs text-gray-400">
            Category to Group to Product to Amount
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-green-400 transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          {WIZARD_STEPS.map((item) => {
            const active = step === item.step;
            const complete = step > item.step;
            return (
              <div
                key={item.step}
                className={`rounded-xl border px-3 py-2 text-center transition-colors ${
                  active
                    ? 'border-accent-30 bg-accent-10 text-accent-muted'
                    : complete
                      ? 'border-green-500/30 bg-green-500/10 text-green-300'
                      : 'border-border bg-surface-secondary text-gray-500'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]">Step {item.step}</p>
                <p className="text-xs font-medium">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First Name *" required error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name *" required error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
              <Input label="Phone" type="tel" {...register('phone')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="WhatsApp Number" type="tel" placeholder="+91 98765 43210" {...register('whatsappNumber')} />
              <Input label="Project Name" placeholder="e.g. Hospital Expansion" {...register('company')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Job Title" {...register('jobTitle')} />
              <Select label="Country" options={COUNTRY_OPTIONS} {...register('country')} />
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-surface-secondary/40 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Decision Maker</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Name" placeholder="e.g. John Smith" {...register('decisionMakerName')} />
              <Input label="Designation" placeholder="e.g. CEO, Purchase Manager" {...register('decisionMakerDesignation')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Status" options={LEAD_STATUS_OPTIONS} {...register('status')} />
            <Select label="Source" options={LEAD_SOURCE_VALUES.map((value) => ({ value, label: value.replace(/_/g, ' ') }))} {...register('source')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Follow-up Date" type="date" className="[color-scheme:dark]" {...register('followUpDate')} />
            <div className="text-xs text-gray-500 self-end">The product and assignment steps come next.</div>
          </div>

          <Textarea label="Notes" rows={3} placeholder="Add notes about this lead..." {...register('notes')} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Select Category</p>
            <p className="text-xs text-gray-500">This list is loaded dynamically from Settings.</p>
          </div>
          <Select
            label="Category *"
            required
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          />
          {stepError && <p className="text-xs text-red-400">{stepError}</p>}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Select Group</p>
            <p className="text-xs text-gray-500">Filtered by the selected category.</p>
          </div>
          <Select
            label="Group *"
            required
            options={groupOptions}
            value={selectedGroup}
            onChange={(e) => handleGroupChange(e.target.value)}
            disabled={!selectedCategory}
          />
          <div className="rounded-xl border border-border bg-surface-secondary/60 p-3 text-xs text-gray-400">
            Category: <span className="text-white">{selectedCategory || 'Not selected'}</span>
          </div>
          {stepError && <p className="text-xs text-red-400">{stepError}</p>}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Select Product</p>
            <p className="text-xs text-gray-500">Pick the exact product. The expected amount will auto-fill from this product.</p>
          </div>
          <Select
            label="Product *"
            required
            options={productOptions}
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            disabled={!selectedGroup}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3 text-xs text-gray-400">
              Group: <span className="text-white">{selectedGroup || 'Not selected'}</span>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3 text-xs text-gray-400">
              Product: <span className="text-white">{selectedProduct?.name || 'Not selected'}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-secondary/50 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Suggestions from previous leads</p>
                <p className="text-[11px] text-gray-400">Tap a suggestion to prefill the product.</p>
              </div>
              {isLoadingProductSuggestions && <span className="text-[11px] text-gray-500">Loading...</span>}
            </div>
            {productSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {productSuggestions.map((suggestion) => {
                  const active = String(suggestion.id) === selectedProductId;
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleProductChange(String(suggestion.id))}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-accent-40 bg-accent-10'
                          : 'border-border bg-surface-secondary/70 hover:border-accent-30 hover:bg-surface-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{suggestion.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {suggestion.category} / {suggestion.group}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-green-300">
                          {formatAmount(Number(suggestion.value || 0))}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Used {suggestion.usageCount} time{suggestion.usageCount === 1 ? '' : 's'}
                        {suggestion.lastUsedAt ? ` · last ${formatRelativeTime(suggestion.lastUsedAt)}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : !isLoadingProductSuggestions ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[11px] text-gray-500">
                No previous lead suggestions yet for this category and group.
              </div>
            ) : null}
          </div>
          {stepError && <p className="text-xs text-red-400">{stepError}</p>}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Enter Expected Amount</p>
            <p className="text-xs text-gray-500">This starts from the selected product price, but you can edit it.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Expected Amount *"
              type="number"
              min="0"
              step="0.01"
              error={errors.value?.message}
              hint="Auto-filled from the selected product"
              {...register('value')}
            />
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3 text-sm text-gray-300">
              <p className="text-xs uppercase tracking-wide text-gray-500">Selected Product Value</p>
              <p className="mt-1 text-white">{selectedProduct ? formatAmount(Number(selectedProduct.value || 0)) : 'Select a product first'}</p>
              <p className="mt-3 text-xs text-gray-500">Final amount can be changed before saving.</p>
            </div>
          </div>
          {stepError && <p className="text-xs text-red-400">{stepError}</p>}
        </div>
      )}

      {step === 6 && (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Assign Lead</p>
            <p className="text-xs text-gray-500">Choose the sales hierarchy level and then pick the responsible user.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Assignment Type"
              required
              options={assignmentRoleOptions}
              value={assignmentRole}
              onChange={(e) => handleAssignmentRoleChange(e.target.value)}
            />
            <Select
              label={assignmentRoleLabel}
              options={assigneeOptions}
              error={errors.assigneeId?.message}
              {...register('assigneeId')}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface-secondary/60 p-3 text-xs text-gray-400">
            Current {assignmentRoleLabel.toLowerCase()}: <span className="text-white">{reviewAssignee?.name || 'Not selected'}</span>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-secondary/40 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Review Lead</p>
            <p className="text-xs text-gray-500">Check everything once before saving.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Lead</p>
              <p className="mt-1 text-sm text-white">{watch('firstName')} {watch('lastName')}</p>
              <p className="text-xs text-gray-400">{watch('company') || 'No project name'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Assignment</p>
              <p className="mt-1 text-sm text-white">{reviewAssignee?.name || 'No assignment selected'}</p>
              <p className="text-xs text-gray-400">{assignmentRoleLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Category</p>
              <p className="mt-1 text-sm text-white">{selectedCategory || 'Not selected'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Group</p>
              <p className="mt-1 text-sm text-white">{selectedGroup || 'Not selected'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Product</p>
              <p className="mt-1 text-sm text-white">{selectedProduct?.name || 'Not selected'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Expected Amount</p>
              <p className="mt-1 text-sm text-green-400">{reviewAmount > 0 ? formatAmount(reviewAmount) : 'Not set'}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/60 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Status / Source</p>
              <p className="mt-1 text-sm text-white">{watch('status')} / {watch('source')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          {step > 1 && (
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
          )}
        </div>
        {step < 7 ? (
          <Button type="button" onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button type="submit" loading={isLoading}>
            Save Lead
          </Button>
        )}
      </div>
    </form>
  );
};
