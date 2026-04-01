export type Role = 'ADMIN' | 'MANAGER' | 'USER';
export type Theme = 'dark' | 'light' | 'system';
export type AccentColor = 'violet' | 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'pink';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'EMAIL_CAMPAIGN' | 'COLD_CALL' | 'TRADE_SHOW' | 'OTHER';
export type DealStage = 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  preference?: Preference;
}

export interface Preference {
  id: string;
  theme: Theme;
  accentColor: AccentColor;
  sidebarCollapsed: boolean;
  selectedModules: string[];
  dashboardLayout: Record<string, any>;
  notifications: { email: boolean; push: boolean; desktop: boolean };
  userId: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: LeadStatus;
  source: LeadSource;
  value?: number;
  currency: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  deals?: Pick<Deal, 'id' | 'title' | 'value' | 'stage'>[];
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedClose?: string;
  actualClose?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  contactId?: string;
  contact?: Pick<Contact, 'id' | 'firstName' | 'lastName' | 'company'>;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  relatedType?: string;
  relatedId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  userId: string;
}

export interface DashboardStats {
  stats: {
    leads: { total: number; thisMonth: number; growth: number };
    contacts: { total: number };
    deals: { total: number; wonValue: number; wonThisMonth: number };
    tasks: { total: number; overdue: number; completedThisMonth: number };
  };
  pipelineByStage: Array<{ stage: DealStage; _sum: { value: number }; _count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  recentActivity: ActivityLog[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type ModuleId =
  | 'leads' | 'contacts' | 'deals' | 'tasks' | 'reports'
  | 'pipeline' | 'calendar' | 'email' | 'documents' | 'products'
  | 'quotes' | 'invoices' | 'campaigns' | 'analytics' | 'forecasting'
  | 'territories' | 'support' | 'knowledge' | 'integrations' | 'automation'
  | 'accounts' | 'tickets' | 'team';

export interface ModuleConfig {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  path: string;
  category: 'sales' | 'marketing' | 'service' | 'analytics' | 'admin';
  isPremium?: boolean;
}
