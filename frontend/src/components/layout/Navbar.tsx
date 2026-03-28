import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Bell, Search, Sun, Moon, Plus, Command,
  UserPlus, Users, DollarSign, CheckSquare,
  Settings, LogOut, User, ChevronRight,
  CheckCircle2, Clock, TrendingUp, AlertCircle, X, Download,
} from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { cn } from '../../utils/cn';
import { useUIStore } from '../../store/uiStore';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { ALL_MODULES } from '../../utils/modules';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/contacts': 'Contacts',
  '/deals': 'Deals',
  '/tasks': 'Tasks',
  '/pipeline': 'Pipeline',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const NEW_ITEMS = [
  { label: 'New Lead',    icon: UserPlus,    path: '/leads' },
  { label: 'New Contact', icon: Users,       path: '/contacts' },
  { label: 'New Deal',    icon: DollarSign,  path: '/deals' },
  { label: 'New Task',    icon: CheckSquare, path: '/tasks' },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', icon: TrendingUp,    color: 'text-green-400',  bg: 'bg-green-500/10',  title: 'Deal closed!',          body: 'Enterprise SaaS deal marked as Won',   time: '2m ago',  read: false },
  { id: '2', icon: UserPlus,      color: 'text-accent-muted', bg: 'bg-accent-10',   title: 'New lead assigned',     body: 'John Smith was added to your pipeline', time: '15m ago', read: false },
  { id: '3', icon: Clock,         color: 'text-orange-400', bg: 'bg-orange-500/10', title: 'Task overdue',          body: 'Follow up with Acme Corp is past due',  time: '1h ago',  read: false },
  { id: '4', icon: CheckCircle2,  color: 'text-blue-400',   bg: 'bg-blue-500/10',   title: 'Task completed',        body: 'Send proposal email marked done',       time: '3h ago',  read: true  },
  { id: '5', icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-500/10',    title: 'Pipeline alert',        body: '3 deals have been stale for 14 days',   time: '5h ago',  read: true  },
];

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return { open, setOpen, ref };
}

export const Navbar: React.FC = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { toggleMobileSidebar } = useUIStore();
  const { theme, setTheme } = useThemeStore();
  const { user }  = useAuthStore();
  const { logout } = useAuth();

  const { installPrompt, isInstalled, install } = usePWA();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const newMenu   = useDropdown();
  const notifMenu = useDropdown();
  const profileMenu = useDropdown();

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const pageTitle = PAGE_TITLES[location.pathname] ||
    ALL_MODULES.find((m) => location.pathname.startsWith(m.path))?.name || 'Sample CRM';

  const handleNewItem = (path: string) => {
    newMenu.setOpen(false);
    if (location.pathname === path) {
      navigate(path + '?new=true', { replace: true });
    } else {
      navigate(path + '?new=true');
    }
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismissNotif = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 gap-4">
      {/* Mobile menu */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="hidden sm:block">
        <motion.h1
          key={location.pathname}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base font-semibold text-white"
        >
          {pageTitle}
        </motion.h1>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center">
        <motion.div animate={{ width: searchOpen ? 280 : 200 }} className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => { setSearchOpen(false); setSearchQuery(''); }}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus-ring-accent focus:border-accent-40 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-600">
            <Command size={10} />K
          </kbd>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Install app button - always visible unless already installed */}
        {!isInstalled && (
          <button
            onClick={() => {
              if (installPrompt) {
                install();
              } else {
                alert('To install: click the install icon (⊕ or ↓) in your browser\'s address bar, or use browser menu → "Install app".');
              }
            }}
            title="Install app"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent-20 hover:bg-accent-30 text-accent-muted hover:text-accent-light border border-accent-20 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:block">Install</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* ── Notifications ── */}
        <div className="relative" ref={notifMenu.ref}>
          <button
            onClick={() => { notifMenu.setOpen((v) => !v); profileMenu.setOpen(false); newMenu.setOpen(false); }}
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              notifMenu.open ? 'bg-accent-20 text-accent-muted' : 'hover:bg-white/10 text-gray-400 hover:text-white'
            )}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifMenu.open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.13 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-surface-elevated border border-border shadow-modal z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-accent-20 text-accent-muted text-xs font-medium rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-accent-muted hover:text-accent-light transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 text-sm">All caught up!</div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 group transition-colors',
                            !n.read ? 'bg-accent-10/50 hover:bg-accent-10' : 'hover:bg-white/5'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', n.bg)}>
                            <Icon size={14} className={n.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-white truncate">{n.title}</p>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
                            <p className="text-xs text-gray-600 mt-1">{n.time}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-border">
                  <button
                    onClick={() => { notifMenu.setOpen(false); navigate('/settings'); }}
                    className="w-full text-xs text-center text-accent-muted hover:text-accent-light transition-colors"
                  >
                    Notification settings
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── New button ── */}
        <div className="relative" ref={newMenu.ref}>
          <button
            onClick={() => { newMenu.setOpen((v) => !v); notifMenu.setOpen(false); profileMenu.setOpen(false); }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              newMenu.open
                ? 'bg-accent-30 text-accent-light border-accent-40'
                : 'bg-accent-20 hover:bg-accent-30 text-accent-muted border-accent-20'
            )}
          >
            <Plus size={14} className={cn('transition-transform duration-200', newMenu.open && 'rotate-45')} />
            <span className="hidden sm:block">New</span>
          </button>

          <AnimatePresence>
            {newMenu.open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-surface-elevated border border-border shadow-modal overflow-hidden z-50"
              >
                {NEW_ITEMS.map(({ label, icon: Icon, path }) => (
                  <button
                    key={path}
                    onClick={() => handleNewItem(path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-accent-10 hover:text-accent-light transition-colors text-left"
                  >
                    <Icon size={15} className="text-accent-muted shrink-0" />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* ── Profile ── */}
        <div className="relative" ref={profileMenu.ref}>
          <button
            onClick={() => { profileMenu.setOpen((v) => !v); notifMenu.setOpen(false); newMenu.setOpen(false); }}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
              profileMenu.open ? 'bg-white/10' : 'hover:bg-white/10'
            )}
          >
            <Avatar name={user?.name || ''} src={user?.avatar} size="sm" />
          </button>

          <AnimatePresence>
            {profileMenu.open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.13 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface-elevated border border-border shadow-modal overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar name={user?.name || ''} src={user?.avatar} size="md" online />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-accent-20 text-accent-muted text-[10px] font-semibold rounded uppercase tracking-wide">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { profileMenu.setOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-300 hover:bg-accent-10 hover:text-accent-light transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <User size={15} className="text-gray-500" />
                      Profile & Account
                    </div>
                    <ChevronRight size={13} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => { profileMenu.setOpen(false); navigate('/settings'); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-300 hover:bg-accent-10 hover:text-accent-light transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={15} className="text-gray-500" />
                      Settings
                    </div>
                    <ChevronRight size={13} className="text-gray-600" />
                  </button>
                </div>

                {/* Divider + Logout */}
                <div className="border-t border-border py-1">
                  <button
                    onClick={() => { profileMenu.setOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
