import { ModuleConfig } from '../types';

export const ALL_MODULES: ModuleConfig[] = [
  // ── Core Sales ──
  { id: 'leads',         name: 'Leads',          description: 'Track and manage potential customers',       icon: 'UserPlus',     path: '/leads',         category: 'sales' },
  { id: 'contacts',      name: 'Contacts',        description: 'Manage your contact database',              icon: 'Users',        path: '/contacts',      category: 'sales' },
  { id: 'deals',         name: 'Deals',           description: 'Track deals through your sales pipeline',   icon: 'DollarSign',   path: '/deals',         category: 'sales' },
  { id: 'sales',         name: 'Sales',           description: 'Sales orders and revenue management',       icon: 'ShoppingCart', path: '/sales',         category: 'sales' },
  { id: 'pipeline',      name: 'Pipeline',        description: 'Visual Kanban sales pipeline',              icon: 'Kanban',       path: '/pipeline',      category: 'sales' },
  { id: 'quotes',        name: 'Quotes',          description: 'Create and send quotes to clients',         icon: 'FileCheck',    path: '/quotes',        category: 'sales' },
  { id: 'accounts',      name: 'Accounts',        description: 'Company and organization management',       icon: 'Building2',    path: '/accounts',      category: 'sales' },
  { id: 'products',      name: 'Products',        description: 'Product catalog management',                icon: 'Package',      path: '/products',      category: 'sales' },

  // ── CRM ──
  { id: 'crm',           name: 'CRM',             description: 'Customer relationship management hub',      icon: 'Users2',       path: '/crm',           category: 'crm' },
  { id: 'tasks',         name: 'Tasks',           description: 'Manage tasks and follow-ups',               icon: 'CheckSquare',  path: '/tasks',         category: 'crm' },
  { id: 'calendar',      name: 'Calendar',        description: 'Schedule meetings and events',              icon: 'Calendar',     path: '/calendar',      category: 'crm' },
  { id: 'email',         name: 'Email',           description: 'Email campaigns and tracking',              icon: 'Mail',         path: '/email',         category: 'crm' },

  // ── Accounting ──
  { id: 'accounting',    name: 'Accounting',      description: 'Financial accounts, journals and ledgers',  icon: 'Calculator',   path: '/accounting',    category: 'accounting' },
  { id: 'invoices',      name: 'Invoices',        description: 'Billing and invoice management',            icon: 'Receipt',      path: '/invoices',      category: 'accounting' },

  // ── Procurement ──
  { id: 'procurement',   name: 'Procurement',     description: 'Purchase orders and vendor management',     icon: 'ClipboardList', path: '/procurement',  category: 'procurement' },

  // ── Stock / Inventory ──
  { id: 'stock',         name: 'Stock',           description: 'Inventory and warehouse management',        icon: 'Boxes',        path: '/stock',         category: 'inventory' },

  // ── Manufacturing ──
  { id: 'manufacturing', name: 'Manufacturing',   description: 'Production orders and BOMs',                icon: 'Factory',      path: '/manufacturing', category: 'manufacturing' },

  // ── Projects ──
  { id: 'projects',      name: 'Projects',        description: 'Project planning and task tracking',        icon: 'FolderKanban', path: '/projects',      category: 'projects' },

  // ── Assets ──
  { id: 'assets',        name: 'Assets',          description: 'Fixed assets and depreciation tracking',    icon: 'Landmark',     path: '/assets',        category: 'accounting' },

  // ── Point of Sale ──
  { id: 'pos',           name: 'Point of Sale',   description: 'Retail point-of-sale management',           icon: 'ShoppingBag',  path: '/pos',           category: 'sales' },

  // ── Quality ──
  { id: 'quality',       name: 'Quality',         description: 'Quality control checks and alerts',         icon: 'BadgeCheck',   path: '/quality',       category: 'manufacturing' },

  // ── Support ──
  { id: 'support',       name: 'Support',         description: 'Customer support ticket management',        icon: 'LifeBuoy',     path: '/support',       category: 'service' },
  { id: 'tickets',       name: 'Tickets',         description: 'Customer support tickets & SLA tracking',   icon: 'Ticket',       path: '/tickets',       category: 'service' },

  // ── HR & Payroll ──
  { id: 'hr',            name: 'HR & Payroll',    description: 'Employee records and payroll management',   icon: 'UsersRound',   path: '/hr',            category: 'hr' },
  { id: 'team',          name: 'Team',            description: 'Team hierarchy and member management',      icon: 'Users',        path: '/team',          category: 'hr' },

  // ── Analytics & Reports ──
  { id: 'reports',       name: 'Reports',         description: 'Analytics and business insights',           icon: 'BarChart2',    path: '/reports',       category: 'analytics' },
  { id: 'analytics',     name: 'Analytics',       description: 'Advanced analytics dashboard',              icon: 'TrendingUp',   path: '/analytics',     category: 'analytics' },

  // ── Admin ──
  { id: 'documents',     name: 'Documents',       description: 'Document management and storage',           icon: 'FileText',     path: '/documents',     category: 'admin' },
  { id: 'automation',    name: 'Automation',      description: 'Workflow automation rules',                 icon: 'Zap',          path: '/automation',    category: 'admin' },
  { id: 'integrations',  name: 'Integrations',    description: 'Third-party integrations',                  icon: 'Plug',         path: '/integrations',  category: 'admin' },
];

export const DEFAULT_MODULES = [
  'leads', 'contacts', 'deals', 'sales', 'pipeline',
  'crm', 'tasks', 'accounting', 'invoices', 'procurement',
  'stock', 'manufacturing', 'projects', 'assets', 'pos',
  'quality', 'support', 'hr', 'reports',
];

export const getModuleById = (id: string) => ALL_MODULES.find((m) => m.id === id);
export const getModulesByCategory = (category: string) => ALL_MODULES.filter((m) => m.category === category);
