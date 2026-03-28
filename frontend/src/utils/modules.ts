import { ModuleConfig } from '../types';

export const ALL_MODULES: ModuleConfig[] = [
  // ── Core Sales (all free) ──
  { id: 'leads',       name: 'Leads',       description: 'Track and manage potential customers',    icon: 'UserPlus',     path: '/leads',       category: 'sales' },
  { id: 'contacts',    name: 'Contacts',    description: 'Manage your contact database',           icon: 'Users',        path: '/contacts',    category: 'sales' },
  { id: 'deals',       name: 'Deals',       description: 'Track deals through your sales pipeline', icon: 'DollarSign',   path: '/deals',       category: 'sales' },
  { id: 'tasks',       name: 'Tasks',       description: 'Manage tasks and follow-ups',            icon: 'CheckSquare',  path: '/tasks',       category: 'sales' },
  { id: 'pipeline',    name: 'Pipeline',    description: 'Visual Kanban sales pipeline',           icon: 'Kanban',       path: '/pipeline',    category: 'sales' },
  { id: 'calendar',    name: 'Calendar',    description: 'Schedule meetings and events',           icon: 'Calendar',     path: '/calendar',    category: 'sales' },
  { id: 'products',    name: 'Products',    description: 'Product catalog management',             icon: 'Package',      path: '/products',    category: 'sales' },
  { id: 'quotes',      name: 'Quotes',      description: 'Create and send quotes to clients',      icon: 'FileCheck',    path: '/quotes',      category: 'sales' },

  // ── Marketing (free) ──
  { id: 'email',       name: 'Email',       description: 'Email campaigns and tracking',           icon: 'Mail',         path: '/email',       category: 'marketing' },

  // ── Analytics (free) ──
  { id: 'reports',     name: 'Reports',     description: 'Analytics and business insights',        icon: 'BarChart2',    path: '/reports',     category: 'analytics' },

  // ── Service (free) ──
  { id: 'support',     name: 'Support',     description: 'Customer support ticket management',     icon: 'LifeBuoy',     path: '/support',     category: 'service' },

  // ── Admin (free) ──
  { id: 'documents',   name: 'Documents',   description: 'Document management and storage',        icon: 'FileText',     path: '/documents',   category: 'admin' },

  // ── Premium modules ──
  { id: 'invoices',    name: 'Invoices',    description: 'Billing and invoice management',         icon: 'Receipt',      path: '/invoices',    category: 'admin',     isPremium: true },
  { id: 'campaigns',   name: 'Campaigns',   description: 'Marketing campaign management',          icon: 'Megaphone',    path: '/campaigns',   category: 'marketing', isPremium: true },
  { id: 'analytics',   name: 'Analytics',   description: 'Advanced analytics dashboard',           icon: 'TrendingUp',   path: '/analytics',   category: 'analytics', isPremium: true },
  { id: 'forecasting', name: 'Forecasting', description: 'Sales forecasting and projections',      icon: 'LineChart',    path: '/forecasting', category: 'analytics', isPremium: true },
  { id: 'territories', name: 'Territories', description: 'Sales territory management',             icon: 'Map',          path: '/territories', category: 'sales',     isPremium: true },
  { id: 'knowledge',   name: 'Knowledge Base', description: 'Internal knowledge management',       icon: 'BookOpen',     path: '/knowledge',   category: 'service',   isPremium: true },
  { id: 'integrations',name: 'Integrations',description: 'Third-party integrations',              icon: 'Plug',         path: '/integrations',category: 'admin',     isPremium: true },
  { id: 'automation',  name: 'Automation',  description: 'Workflow automation rules',              icon: 'Zap',          path: '/automation',  category: 'admin',     isPremium: true },
];

export const DEFAULT_MODULES = [
  'leads', 'contacts', 'deals', 'tasks', 'pipeline',
  'calendar', 'products', 'quotes', 'email', 'reports', 'support', 'documents',
];

export const getModuleById = (id: string) => ALL_MODULES.find((m) => m.id === id);
export const getModulesByCategory = (category: string) => ALL_MODULES.filter((m) => m.category === category);
