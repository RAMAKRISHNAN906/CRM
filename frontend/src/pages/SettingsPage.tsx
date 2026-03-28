import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesService } from '../services/preferences.service';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { ModuleSelector } from '../components/dashboard/ModuleSelector';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { Palette, Layout, Bell, Shield, Sun, Moon, Monitor, Lock } from 'lucide-react';
import { AccentColor, Theme } from '../types';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';

const ACCENT_COLORS: Array<{ id: AccentColor; label: string; hex: string }> = [
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'blue',   label: 'Blue',   hex: '#2563eb' },
  { id: 'cyan',   label: 'Cyan',   hex: '#0891b2' },
  { id: 'green',  label: 'Green',  hex: '#16a34a' },
  { id: 'orange', label: 'Orange', hex: '#ea580c' },
  { id: 'red',    label: 'Red',    hex: '#dc2626' },
  { id: 'pink',   label: 'Pink',   hex: '#db2777' },
];

const THEMES: Array<{ id: Theme; label: string; icon: React.ReactNode }> = [
  { id: 'dark',   label: 'Dark',   icon: <Moon size={16} /> },
  { id: 'light',  label: 'Light',  icon: <Sun size={16} /> },
  { id: 'system', label: 'System', icon: <Monitor size={16} /> },
];

const SETTINGS_TABS = [
  { id: 'appearance',    label: 'Appearance',    icon: <Palette size={16} /> },
  { id: 'modules',       label: 'Modules',        icon: <Layout size={16} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={16} /> },
  { id: 'security',      label: 'Security',       icon: <Shield size={16} /> },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const { theme, accentColor, setTheme, setAccentColor } = useThemeStore();

  const { data: prefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesService.get,
  });

  const updateMutation = useMutation({
    mutationFn: preferencesService.update,
    onSuccess: (updatedPref) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      // Sync auth store so sidebar/navbar reflect changes instantly
      if (updatedPref && user) {
        updateUser({ preference: { ...(user.preference as any), ...updatedPref } });
      }
      toast.success('Settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    updateMutation.mutate({ theme: t });
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
    updateMutation.mutate({ accentColor: color });
  };

  const handleModulesSave = (modules: string[]) => {
    updateMutation.mutate({ selectedModules: modules });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.next.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Customize your Sample CRM experience</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="sm:w-48 shrink-0">
          <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all whitespace-nowrap sm:w-full',
                  activeTab === tab.id
                    ? 'bg-accent-20 text-accent-light border border-accent-20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader title="Appearance" subtitle="Customize your visual preferences" icon={<Palette size={16} />} />
                <div className="space-y-8">
                  {/* Theme */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-3 block">Theme</label>
                    <div className="flex gap-3">
                      {THEMES.map(({ id, label, icon }) => (
                        <button
                          key={id}
                          onClick={() => handleThemeChange(id)}
                          className={cn(
                            'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                            theme === id
                              ? 'border-accent-50 bg-accent-10 text-accent-muted'
                              : 'border-border bg-surface-tertiary text-gray-400 hover:border-border-strong'
                          )}
                        >
                          {icon}
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent color */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-3 block">Accent Color</label>
                    <div className="flex gap-3 flex-wrap">
                      {ACCENT_COLORS.map(({ id, label, hex }) => (
                        <button
                          key={id}
                          onClick={() => handleAccentChange(id)}
                          title={label}
                          className={cn(
                            'w-9 h-9 rounded-full transition-all',
                            accentColor === id ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-secondary scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                          )}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Current: <span className="text-accent-muted font-medium capitalize">{accentColor}</span>
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'modules' && (
              <Card>
                <CardHeader title="Module Customization" subtitle="Choose which modules appear in your sidebar" icon={<Layout size={16} />} />
                <ModuleSelector
                  selectedModules={
                    Array.isArray(prefs?.selectedModules) && prefs!.selectedModules.length > 0
                      ? prefs!.selectedModules
                      : ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'reports']
                  }
                  onSave={handleModulesSave}
                  isLoading={updateMutation.isPending}
                />
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader title="Notifications" subtitle="Configure how you receive notifications" icon={<Bell size={16} />} />
                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                    { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'desktop', label: 'Desktop Alerts', desc: 'Show desktop notification banners' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-surface-tertiary border border-border">
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        className="relative inline-flex w-10 h-5 rounded-full bg-accent transition-colors"
                        role="switch"
                        aria-checked="true"
                      >
                        <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader title="Security" subtitle="Manage your account security" icon={<Shield size={16} />} />
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Account Secured</p>
                        <p className="text-xs text-gray-400">Your account is protected with JWT authentication and bcrypt password hashing</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-tertiary border border-border">
                      <div>
                        <p className="text-sm font-medium text-white">Active Sessions</p>
                        <p className="text-xs text-gray-500">Manage where you're logged in</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsSessionsModalOpen(true)}>
                        View Sessions
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-tertiary border border-border">
                      <div>
                        <p className="text-sm font-medium text-white">Change Password</p>
                        <p className="text-xs text-gray-500">Update your account password</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setIsPasswordModalOpen(true)}>
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-tertiary border border-border">
                    <p className="text-xs text-gray-500">
                      Last login: <span className="text-gray-300">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Account created: <span className="text-gray-300">{user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setPasswordForm({ current: '', next: '', confirm: '' }); }} title="Change Password" size="sm">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={passwordForm.current}
            onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            required
            value={passwordForm.next}
            onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={passwordLoading} icon={<Lock size={14} />}>Update Password</Button>
          </div>
        </form>
      </Modal>

      {/* Active Sessions Modal */}
      <Modal isOpen={isSessionsModalOpen} onClose={() => setIsSessionsModalOpen(false)} title="Active Sessions" size="sm">
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-surface-tertiary border border-accent-20">
            <div className="flex items-start gap-3">
              <Monitor size={16} className="text-accent-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Current Session</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{navigator.userAgent.split('(')[0].trim()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Signed in as <span className="text-gray-300">{user?.email}</span>
                </p>
                {user?.lastLoginAt && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Since {new Date(user.lastLoginAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-xs text-green-400 font-medium shrink-0">Active</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">Only one active session detected.</p>
          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={() => setIsSessionsModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
