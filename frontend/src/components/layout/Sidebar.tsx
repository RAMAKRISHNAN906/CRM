import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, UserPlus, Users, DollarSign, CheckSquare,
  BarChart2, Settings, LogOut, ChevronLeft, ChevronRight,
  Kanban, Zap, X, Sparkles,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { ALL_MODULES } from '../../utils/modules';

const iconMap: Record<string, any> = {
  LayoutDashboard, UserPlus, Users, DollarSign, CheckSquare, BarChart2, Kanban, Zap,
  ...(LucideIcons as any),
};

const navItems = [
  { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
];

const bottomNavItems = [
  { id: 'settings', icon: 'Settings', label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, setMobileSidebarOpen } = useUIStore();
  const location = useLocation();

  const rawModules = user?.preference?.selectedModules;
  const selectedModules: string[] = Array.isArray(rawModules)
    ? rawModules
    : typeof rawModules === 'string'
      ? (() => { try { return JSON.parse(rawModules); } catch { return []; } })()
      : ['leads', 'contacts', 'deals', 'tasks', 'reports'];
  const moduleNavItems = selectedModules
    .map((id) => ALL_MODULES.find((m) => m.id === id))
    .filter(Boolean)
    .slice(0, 12) as typeof ALL_MODULES;

  const allNavItems = [
    ...navItems,
    ...moduleNavItems.map((m) => ({ id: m.id, icon: m.icon, label: m.name, path: m.path })),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border', sidebarCollapsed ? 'justify-center px-3' : '')}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 overflow-hidden shadow-glow-accent">
          <img src="/favicon.svg" alt="NexusCRM" className="w-full h-full" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <span className="text-white font-bold text-lg whitespace-nowrap">Sample CRM</span>
              <span className="block text-xs text-gray-500 -mt-0.5">Enterprise Edition</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {allNavItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                sidebarCollapsed ? 'justify-center px-2' : '',
                isActive
                  ? 'bg-accent-20 text-accent-light border border-accent-20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-accent-15"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon size={17} className={cn('shrink-0 relative z-10', isActive && 'text-accent-muted')} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1.5 bg-surface-overlay border border-border rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-dropdown">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-2 space-y-0.5 border-t border-border">
        {bottomNavItems.map((item) => {
          const Icon = iconMap[item.icon] || Settings;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                sidebarCollapsed ? 'justify-center px-2' : '',
                isActive ? 'bg-accent-20 text-accent-light' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}

        {/* User profile */}
        <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1', sidebarCollapsed ? 'justify-center px-2' : '')}>
          <Avatar name={user?.name || ''} src={user?.avatar} size="sm" online />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden min-w-0"
              >
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full border-r border-border z-40 sidebar-glass"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <SidebarContent />
        </div>

        {/* Collapse toggle — outside overflow-hidden so it renders beyond the edge */}
        <button
          onClick={toggleSidebar}
          className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center hover:bg-accent-20 hover:border-accent-30 transition-colors z-50"
        >
          {sidebarCollapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronLeft size={12} className="text-gray-400" />}
        </button>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 h-full w-[240px] border-r border-border z-50 sidebar-glass"
            >
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X size={18} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
