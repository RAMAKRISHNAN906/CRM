import { z } from 'zod';
import { LEAD_STATUS_VALUES, normalizeLeadStatus } from './leadStatus';

const leadStatusSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return normalizeLeadStatus(value) ?? value;
}, z.enum(LEAD_STATUS_VALUES).optional());

const leadSelectedProductSchema = z.object({
  id: z.number().int().positive(),
  category: z.string().min(1),
  group: z.string().min(1),
  name: z.string().min(1),
  value: z.number().min(0),
  quantity: z.number().int().min(1).optional().default(1),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  status: leadStatusSchema,
  source: z.enum(['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'COLD_CALL', 'TRADE_SHOW', 'OTHER']).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  productIds: z.array(z.number().int().positive()).optional(),
  selectedProducts: z.array(leadSelectedProductSchema).optional(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

export const dealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().max(5000).optional(),
  contactId: z.string().uuid().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const preferenceSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  accentColor: z.enum(['violet', 'blue', 'cyan', 'green', 'orange', 'red', 'pink']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  selectedModules: z.array(z.string()).optional(),
  dashboardLayout: z.record(z.any()).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    desktop: z.boolean().optional(),
  }).optional(),
});

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
