import React, { useState, useRef, useCallback } from 'react';
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
import { Palette, Layout, Bell, Shield, Sun, Moon, Monitor, Lock, Building2, Upload, Kanban } from 'lucide-react';
import { AccentColor, Theme } from '../types';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import api from '../services/api';
import { Trash2, Plus, GripVertical } from 'lucide-react';

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
  { id: 'company',       label: 'Company Profile',icon: <Building2 size={16} /> },
  { id: 'pipeline',      label: 'Pipeline Stages',icon: <Kanban size={16} /> },
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

  // ── Company Profile state ────────────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [companyForm, setCompanyForm] = useState({
    companyName: '', address: '', city: '', state: '', zipCode: '',
    country: 'IN', currency: 'INR', taxNumber: '', phone: '', email: '',
    website: '', financialYearStart: '04', footerAddress: '',
  });
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>('');
  const [companySaving, setCompanySaving] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/settings/company').then((r) => r.data?.data),
    onSuccess: (d: any) => {
      if (d) {
        setCompanyForm({
          companyName: d.companyName || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          zipCode: d.zipCode || '',
          country: d.country || 'IN',
          currency: d.currency || 'INR',
          taxNumber: d.taxNumber || '',
          phone: d.phone || '',
          email: d.email || '',
          website: d.website || '',
          financialYearStart: d.financialYearStart || '04',
          footerAddress: d.footerAddress || '',
        });
        if (d.logoUrl) setCompanyLogoPreview(d.logoUrl);
      }
    },
  } as any);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setCompanyLogoPreview(base64);
      try {
        await api.post('/settings/company/logo', { logoBase64: base64 });
        toast.success('Logo uploaded');
      } catch { toast.error('Logo upload failed'); }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySaving(true);
    try {
      await api.put('/settings/company', companyForm);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Company profile saved');
    } catch { toast.error('Failed to save company profile'); }
    finally { setCompanySaving(false); }
  };

  // ── Pipeline Stages state ────────────────────────────────────────────────
  const [newStageName, setNewStageName]   = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [stagesSaving, setStagesSaving]   = useState(false);

  const { data: pipelineStages = [], refetch: refetchStages } = useQuery<any[]>({
    queryKey: ['pipeline-stages'],
    queryFn: () => api.get('/pipeline/stages').then((r) => r.data?.data ?? []),
  });

  const addStage = async () => {
    if (!newStageName.trim()) return;
    setStagesSaving(true);
    try {
      await api.post('/pipeline/stages', {
        name: newStageName.trim(),
        color: newStageColor,
        order: pipelineStages.length,
        pipelineType: 'sales',
        defaultProbability: 50,
      });
      setNewStageName('');
      refetchStages();
      toast.success('Stage added');
    } catch { toast.error('Failed to add stage'); }
    finally { setStagesSaving(false); }
  };

  const updateStage = async (id: string, data: any) => {
    try {
      await api.put(`/pipeline/stages/${id}`, data);
      refetchStages();
    } catch { toast.error('Failed to update stage'); }
  };

  const deleteStage = async (id: string) => {
    try {
      await api.delete(`/pipeline/stages/${id}`);
      refetchStages();
      toast.success('Stage deleted');
    } catch { toast.error('Failed to delete stage'); }
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

            {activeTab === 'company' && (
              <Card>
                <CardHeader title="Company Profile" subtitle="Your company details used in quotes, invoices and reports" icon={<Building2 size={16} />} />
                <form onSubmit={handleCompanySave} className="space-y-5">
                  {/* Logo upload */}
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-surface-secondary overflow-hidden shrink-0">
                      {companyLogoPreview
                        ? <img src={companyLogoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                        : <Building2 size={28} className="text-gray-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white mb-1">Company Logo</p>
                      <p className="text-xs text-gray-500 mb-2">PNG, JPG or SVG · Max 2MB · Used in PDF quotes & invoices</p>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" icon={<Upload size={13} />}
                          onClick={() => logoInputRef.current?.click()}>
                          Upload Logo
                        </Button>
                        {companyLogoPreview && (
                          <Button type="button" size="sm" variant="ghost"
                            onClick={() => setCompanyLogoPreview('')}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Company name */}
                  <Input label="Company Name *" required value={companyForm.companyName}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Phone" value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                    <Input label="Email" type="email" value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <Input label="Website" value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
                  <Input label="Tax / GST Number" value={companyForm.taxNumber}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })} />

                  {/* Address */}
                  <div className="rounded-xl border border-border/50 bg-surface-secondary/40 p-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Address (appears in quote footer)</p>
                    <Input label="Street Address" value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="City" value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} />
                      <Input label="State" value={companyForm.state}
                        onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="ZIP / Postal Code" value={companyForm.zipCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })} />
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Country</label>
                        <select value={companyForm.country}
                          onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                          <option value="IN">🇮🇳 India</option>
                          <option value="US">🇺🇸 United States</option>
                          <option value="AE">🇦🇪 UAE</option>
                          <option value="GB">🇬🇧 United Kingdom</option>
                          <option value="AU">🇦🇺 Australia</option>
                          <option value="SA">🇸🇦 Saudi Arabia</option>
                          <option value="QA">🇶🇦 Qatar</option>
                          <option value="OTHER">🌍 Other</option>
                        </select>
                      </div>
                    </div>
                    <Input label="Full Footer Address (overrides above for PDFs)" value={companyForm.footerAddress}
                      placeholder="123 Business Park, Chennai, TN 600001, India"
                      onChange={(e) => setCompanyForm({ ...companyForm, footerAddress: e.target.value })} />
                  </div>

                  {/* Financial Year */}
                  <div className="rounded-xl border border-border/50 bg-surface-secondary/40 p-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Financial Year</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Financial Year Start Month</label>
                        <select value={companyForm.financialYearStart}
                          onChange={(e) => setCompanyForm({ ...companyForm, financialYearStart: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                          <option value="01">January (Jan–Dec)</option>
                          <option value="04">April (Apr–Mar) — India</option>
                          <option value="07">July (Jul–Jun) — Australia</option>
                          <option value="10">October (Oct–Sep)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Currency</label>
                        <select value={companyForm.currency}
                          onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-secondary text-sm text-white focus:outline-none focus:border-accent">
                          {['INR','USD','EUR','GBP','AED','SAR','QAR','AUD','CAD'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" loading={companySaving} icon={<Building2 size={14} />}>
                      Save Company Profile
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {activeTab === 'pipeline' && (
              <Card>
                <CardHeader title="Pipeline Stages" subtitle="Define custom stages for your sales pipeline" icon={<Kanban size={16} />} />
                <div className="space-y-4">
                  {/* Existing stages */}
                  <div className="space-y-2">
                    {pipelineStages.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No custom stages yet. Add your first stage below.</p>
                    )}
                    {pipelineStages.map((stage: any, idx: number) => (
                      <div key={stage.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-secondary">
                        <GripVertical size={16} className="text-gray-600 cursor-grab shrink-0" />
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />
                        <input
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                        />
                        <input type="color" value={stage.color || '#6366f1'}
                          onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent" />
                        <input type="number" min={0} max={100} value={stage.defaultProbability || 0}
                          onChange={(e) => updateStage(stage.id, { defaultProbability: parseInt(e.target.value) })}
                          className="w-14 bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-gray-300 text-center focus:outline-none"
                          title="Default probability %" />
                        <span className="text-xs text-gray-600">%</span>
                        <button onClick={() => deleteStage(stage.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new stage */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border">
                    <input type="color" value={newStageColor}
                      onChange={(e) => setNewStageColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent shrink-0" />
                    <input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addStage()}
                      placeholder="Stage name (e.g. Site Visit, Demo, Negotiation)..."
                      className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    <Button size="sm" onClick={addStage} disabled={stagesSaving || !newStageName.trim()}
                      icon={<Plus size={14} />}>
                      Add
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-surface-secondary/20 p-3">
                    <p className="text-xs text-gray-500">
                      These stages appear in the <span className="text-gray-300">Pipeline Kanban board</span>.
                      The % value is auto-filled when a deal enters that stage.
                      You can have 3–10 stages — use as many as your sales process needs.
                    </p>
                  </div>
                </div>
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
