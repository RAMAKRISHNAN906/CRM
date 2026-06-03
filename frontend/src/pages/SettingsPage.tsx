import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesService } from '../services/preferences.service';
import { settingsProductsService } from '../services/settingsProducts.service';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useI18nStore } from '../i18n';
import { ModuleSelector } from '../components/dashboard/ModuleSelector';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import {
  Palette, Layout, Bell, Shield, Sun, Moon, Monitor, Lock,
  Building2, Upload, Kanban, DollarSign, Settings, Globe,
  ChevronRight, CalendarDays, Mail,
} from 'lucide-react';
import { AccentColor, Theme } from '../types';
import { ProductCategory } from '../types';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import api from '../services/api';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { getCurrentCurrency, setCurrentCurrency } from '../utils/formatters';

// ── Constants ─────────────────────────────────────────────────────────────────
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

const NAV_SECTIONS = [
  { id: 'app',        label: 'App Settings',         icon: <Globe size={15} /> },
  { id: 'general',    label: 'General Settings',     icon: <Settings size={15} /> },
  { id: 'company',    label: 'Company Settings',     icon: <Building2 size={15} /> },
  { id: 'logo',       label: 'Company Logo',         icon: <Upload size={15} /> },
  { id: 'currency',   label: 'Currency & Finance',   icon: <DollarSign size={15} /> },
  { id: 'products',   label: 'Product Configuration', icon: <Building2 size={15} /> },
  { id: 'modules',    label: 'Module Visibility',    icon: <Layout size={15} /> },
  { id: 'pipeline',   label: 'Pipeline Stages',      icon: <Kanban size={15} /> },
  { id: 'notifications', label: 'Notifications',     icon: <Bell size={15} /> },
  { id: 'security',   label: 'Security',             icon: <Shield size={15} /> },
];

const LANGUAGES = [
  { code: 'en',  flag: '🇺🇸', label: 'English' },
  { code: 'zh',  flag: '🇨🇳', label: 'Chinese' },
  { code: 'es',  flag: '🇪🇸', label: 'Spanish' },
  { code: 'pt',  flag: '🇧🇷', label: 'Portuguese' },
  { code: 'fr',  flag: '🇫🇷', label: 'French' },
  { code: 'ar',  flag: '🇸🇦', label: 'Arabic' },
  { code: 'az',  flag: '🇦🇿', label: 'Azerbaijani' },
  { code: 'bg',  flag: '🇧🇬', label: 'Bulgarian' },
  { code: 'hr',  flag: '🇭🇷', label: 'Croatian' },
  { code: 'cs',  flag: '🇨🇿', label: 'Czech' },
  { code: 'da',  flag: '🇩🇰', label: 'Danish' },
  { code: 'nl',  flag: '🇳🇱', label: 'Dutch' },
  { code: 'et',  flag: '🇪🇪', label: 'Estonian' },
  { code: 'fi',  flag: '🇫🇮', label: 'Finnish' },
  { code: 'de',  flag: '🇩🇪', label: 'German' },
  { code: 'el',  flag: '🇬🇷', label: 'Greek' },
  { code: 'hu',  flag: '🇭🇺', label: 'Hungarian' },
  { code: 'id',  flag: '🇮🇩', label: 'Indonesian' },
  { code: 'it',  flag: '🇮🇹', label: 'Italian' },
  { code: 'ja',  flag: '🇯🇵', label: 'Japanese' },
  { code: 'kk',  flag: '🇰🇿', label: 'Kazakh' },
  { code: 'ko',  flag: '🇰🇷', label: 'Korean' },
  { code: 'lv',  flag: '🇱🇻', label: 'Latvian' },
  { code: 'lt',  flag: '🇱🇹', label: 'Lithuanian' },
  { code: 'ms',  flag: '🇲🇾', label: 'Malay' },
  { code: 'no',  flag: '🇳🇴', label: 'Norwegian' },
  { code: 'fa',  flag: '🇮🇷', label: 'Persian' },
  { code: 'pl',  flag: '🇵🇱', label: 'Polish' },
  { code: 'ro',  flag: '🇷🇴', label: 'Romanian' },
  { code: 'ru',  flag: '🇷🇺', label: 'Russian' },
  { code: 'sk',  flag: '🇸🇰', label: 'Slovak' },
  { code: 'sv',  flag: '🇸🇪', label: 'Swedish' },
  { code: 'th',  flag: '🇹🇭', label: 'Thai' },
  { code: 'tr',  flag: '🇹🇷', label: 'Turkish' },
  { code: 'uk',  flag: '🇺🇦', label: 'Ukrainian' },
  { code: 'uz',  flag: '🇺🇿', label: 'Uzbek' },
  { code: 'vi',  flag: '🇻🇳', label: 'Vietnamese' },
  { code: 'ur',  flag: '🇵🇰', label: 'Urdu' },
  { code: 'hy',  flag: '🇦🇲', label: 'Armenian' },
  { code: 'ka',  flag: '🇬🇪', label: 'Georgian' },
  { code: 'fil', flag: '🇵🇭', label: 'Filipino' },
  { code: 'hi',  flag: '🇮🇳', label: 'Hindi' },
];

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', label: 'India' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
  { code: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'AE', flag: '🇦🇪', label: 'UAE' },
  { code: 'AU', flag: '🇦🇺', label: 'Australia' },
  { code: 'CA', flag: '🇨🇦', label: 'Canada' },
  { code: 'SA', flag: '🇸🇦', label: 'Saudi Arabia' },
  { code: 'QA', flag: '🇶🇦', label: 'Qatar' },
  { code: 'SG', flag: '🇸🇬', label: 'Singapore' },
  { code: 'DE', flag: '🇩🇪', label: 'Germany' },
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'JP', flag: '🇯🇵', label: 'Japan' },
  { code: 'CN', flag: '🇨🇳', label: 'China' },
  { code: 'BR', flag: '🇧🇷', label: 'Brazil' },
  { code: 'MX', flag: '🇲🇽', label: 'Mexico' },
  { code: 'ZA', flag: '🇿🇦', label: 'South Africa' },
  { code: 'NG', flag: '🇳🇬', label: 'Nigeria' },
  { code: 'OTHER', flag: '🌍', label: 'Other (specify)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
];

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-4 mb-5 border-b border-white/8">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Field row (label : input) like the screenshot ─────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/60 sm:w-48 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const fieldCls =
  'w-full px-3 py-2 rounded-lg border border-border bg-surface-secondary text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent transition-colors';

const sortStages = (stages: any[]) =>
  [...stages].sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

// ── Main Page ─────────────────────────────────────────────────────────────────
export const SettingsPage: React.FC = () => {
  const defaultCurrency = getCurrentCurrency();
  const [activeSection, setActiveSection] = useState('app');
  const [appForm, setAppForm] = useState({
    language:   'en',
    country:    'IN',
    dateFormat: 'DD/MM/YYYY',
    email:      '',
  });
  const [appSaving, setAppSaving]       = useState(false);
  const [langSearch, setLangSearch]     = useState('');
  const [langOpen, setLangOpen]         = useState(false);
  const [customCountry, setCustomCountry] = useState('');
  const langRef = React.useRef<HTMLDivElement>(null);
  const { setLang } = useI18nStore();

  // Close language dropdown on outside click
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { updateUser } = useAuthStore();
  const { theme, accentColor, setTheme, setAccentColor } = useThemeStore();

  // ── Preferences ───────────────────────────────────────────────────────────
  const { data: prefs } = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesService.get,
  });

  const updateMutation = useMutation({
    mutationFn: preferencesService.update,
    onSuccess: (updatedPref) => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      if (updatedPref && user) {
        updateUser({ preference: { ...(user.preference as any), ...updatedPref } });
      }
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  // ── Company ────────────────────────────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [companyForm, setCompanyForm] = useState({
    companyName: '', address: '', city: '', state: '', zipCode: '',
    country: 'IN', currency: defaultCurrency, taxNumber: '', vatNumber: '',
    regNumber: '', phone: '', email: '', website: '',
    financialYearStart: '04', footerAddress: '',
  });
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get('/settings/company').then((r) => r.data?.data),
  });

  useEffect(() => {
    if (companyData) {
      const d = companyData as any;
      const currency = d.currency || defaultCurrency;
      setCompanyForm({
        companyName:        d.companyName || '',
        address:            d.address || '',
        city:               d.city || '',
        state:              d.state || '',
        zipCode:            d.zipCode || '',
        country:            d.country || 'IN',
        currency,
        taxNumber:          d.taxNumber || '',
        vatNumber:          d.vatNumber || '',
        regNumber:          d.regNumber || '',
        phone:              d.phone || '',
        email:              d.email || '',
        website:            d.website || '',
        financialYearStart: d.financialYearStart || '04',
        footerAddress:      d.footerAddress || '',
      });
      setCurrentCurrency(currency);
      if (d.logoUrl) setCompanyLogoPreview(d.logoUrl);
      // Pre-fill app email from company email
      if (d.email) setAppForm((f) => ({ ...f, email: d.email, country: d.country || 'IN' }));
    }
  }, [companyData]);

  const handleAppSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppSaving(true);
    try {
      const payload = {
        ...appForm,
        country: appForm.country === 'OTHER' ? customCountry.trim() || 'OTHER' : appForm.country,
      };
      localStorage.setItem('nexuscrm_app_settings', JSON.stringify(payload));
      // Apply language globally
      setLang(appForm.language);
      toast.success('App settings saved — language applied!');
    } finally {
      setAppSaving(false);
    }
  };

  // Load saved app settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexuscrm_app_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAppForm((f) => ({ ...f, ...parsed }));
        if (parsed.language) setLang(parsed.language);
        // If country doesn't match any option it was a custom one
        if (parsed.country && !COUNTRIES.find((c) => c.code === parsed.country)) {
          setCustomCountry(parsed.country);
          setAppForm((f) => ({ ...f, country: 'OTHER' }));
        }
      } catch {}
    }
  }, []);

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
      setCurrentCurrency(companyForm.currency);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Company settings saved');
    } catch { toast.error('Failed to save company settings'); }
    finally { setCompanySaving(false); }
  };

  // ── Pipeline Stages ────────────────────────────────────────────────────────
  const { data: settingsProducts, refetch: refetchSettingsProducts } = useQuery({
    queryKey: ['settings-products'],
    queryFn: settingsProductsService.get,
  });
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productForm, setProductForm] = useState({ category: '', group: '', product: '', value: '' });
  const [productsSaving, setProductsSaving] = useState(false);

  useEffect(() => {
    if (settingsProducts?.categories) {
      setProductCategories(settingsProducts.categories);
    }
  }, [settingsProducts]);

  const addConfiguredProduct = () => {
    const categoryName = productForm.category.trim();
    const groupName = productForm.group.trim();
    const productName = productForm.product.trim();
    const productValue = Number(productForm.value || 0);
    if (!categoryName || !groupName || !productName) return;

    setProductCategories((prev) => {
      const next = [...prev];
      let category = next.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (!category) {
        category = { name: categoryName, groups: [] };
        next.push(category);
      }

      let group = category.groups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
      if (!group) {
        group = { name: groupName, products: [] };
        category.groups.push(group);
      }

      if (group.products.some((p) => p.name.toLowerCase() === productName.toLowerCase())) return next;

      group.products.push({
        id: Date.now(),
        name: productName,
        value: Number.isFinite(productValue) ? productValue : 0,
      });
      return next;
    });

    setProductForm({ category: '', group: '', product: '', value: '' });
  };

  const removeConfiguredProduct = (categoryName: string, groupName: string, productName: string) => {
    setProductCategories((prev) =>
      prev
        .map((category) => {
          if (category.name !== categoryName) return category;
          return {
            ...category,
            groups: category.groups
              .map((group) => {
                if (group.name !== groupName) return group;
                return { ...group, products: group.products.filter((p) => p.name !== productName) };
              })
              .filter((group) => group.products.length > 0),
          };
        })
        .filter((category) => category.groups.length > 0)
    );
  };

  const saveConfiguredProducts = async () => {
    setProductsSaving(true);
    try {
      await settingsProductsService.update(productCategories);
      await refetchSettingsProducts();
      toast.success('Product configuration saved');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Failed to save product configuration';
      toast.error(message);
    } finally {
      setProductsSaving(false);
    }
  };

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
      const res = await api.post('/pipeline/stages', {
        name: newStageName.trim(), color: newStageColor,
        order: pipelineStages.length + 1, pipelineType: 'sales', defaultProbability: 50,
      });
      const created = res?.data?.data;
      if (created) {
        queryClient.setQueryData<any[]>(['pipeline-stages'], (prev = []) =>
          sortStages([...prev.filter((stage) => stage.id !== created.id), created])
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-board'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-funnel'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-analytics'] }),
      ]);
      setNewStageName('');
      await refetchStages();
      toast.success('Stage added');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Failed to add stage';
      toast.error(message);
    }
    finally { setStagesSaving(false); }
  };

  const updateStage = async (id: string, data: any) => {
    try {
      const res = await api.put(`/pipeline/stages/${id}`, data);
      const updated = res?.data?.data;
      if (updated) {
        queryClient.setQueryData<any[]>(['pipeline-stages'], (prev = []) =>
          sortStages(prev.map((stage) => (stage.id === updated.id ? { ...stage, ...updated } : stage)))
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-board'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-funnel'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-analytics'] }),
      ]);
      await refetchStages();
    }
    catch (err: any) {
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Failed to update stage';
      toast.error(message);
    }
  };

  const deleteStage = async (id: string) => {
    try {
      await api.delete(`/pipeline/stages/${id}`);
      queryClient.setQueryData<any[]>(['pipeline-stages'], (prev = []) =>
        sortStages(prev.filter((stage) => stage.id !== id))
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-board'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-funnel'] }),
        queryClient.invalidateQueries({ queryKey: ['pipeline-analytics'] }),
      ]);
      await refetchStages();
      toast.success('Stage deleted');
    }
    catch (err: any) {
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Failed to delete stage';
      toast.error(message);
    }
  };

  // ── Password ───────────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) { toast.error('New passwords do not match'); return; }
    if (passwordForm.next.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally { setPasswordLoading(false); }
  };

  const activeLabel = NAV_SECTIONS.find((s) => s.id === activeSection)?.label ?? 'Settings';

  return (
    <div className="space-y-4">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-0.5">Manage your CRM preferences and company information</p>
      </motion.div>

      {/* Layout: content left, nav right */}
      <div className="flex flex-col-reverse lg:flex-row gap-5 items-start">

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Card className="p-6">

              {/* ── App Settings ── */}
              {activeSection === 'app' && (
                <div>
                  <SectionHeader title="App Settings" subtitle="Update your app configuration" />
                  <form onSubmit={handleAppSave} className="space-y-0">

                    {/* ── Language (searchable flag picker) ── */}
                    <FieldRow label="* Language:">
                      <div ref={langRef} className="relative">
                        {/* Trigger */}
                        <button
                          type="button"
                          onClick={() => { setLangOpen((o) => !o); setLangSearch(''); }}
                          className={`${fieldCls} flex items-center gap-2 text-left`}
                        >
                          <span className="text-lg leading-none">
                            {LANGUAGES.find((l) => l.code === appForm.language)?.flag ?? '🌐'}
                          </span>
                          <span className="flex-1">
                            {LANGUAGES.find((l) => l.code === appForm.language)?.label ?? appForm.language}
                          </span>
                          <ChevronRight size={14} className={`text-gray-500 transition-transform ${langOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {langOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
                            {/* Search */}
                            <div className="p-2 border-b border-border">
                              <div className="flex items-center gap-2 px-2 py-1.5 bg-surface-secondary rounded-lg">
                                <Globe size={12} className="text-gray-500 shrink-0" />
                                <input
                                  autoFocus
                                  value={langSearch}
                                  onChange={(e) => setLangSearch(e.target.value)}
                                  placeholder="Search language…"
                                  className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder:text-gray-600"
                                />
                              </div>
                            </div>
                            {/* List */}
                            <div className="max-h-56 overflow-y-auto">
                              {LANGUAGES.filter((l) =>
                                l.label.toLowerCase().includes(langSearch.toLowerCase())
                              ).map((l) => (
                                <button
                                  key={l.code}
                                  type="button"
                                  onClick={() => {
                                    setAppForm({ ...appForm, language: l.code });
                                    setLangOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${
                                    appForm.language === l.code ? 'bg-accent/10 text-accent-light' : 'text-white'
                                  }`}
                                >
                                  <span className="text-lg leading-none w-6 text-center">{l.flag}</span>
                                  <span className="flex-1">{l.label}</span>
                                  {appForm.language === l.code && (
                                    <span className="text-accent-light text-xs">✓</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </FieldRow>

                    {/* ── Country ── */}
                    <FieldRow label="* Country:">
                      <div className="space-y-2">
                        <select className={fieldCls} value={appForm.country}
                          onChange={(e) => {
                            setAppForm({ ...appForm, country: e.target.value });
                            if (e.target.value !== 'OTHER') setCustomCountry('');
                          }}>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                          ))}
                        </select>
                        {appForm.country === 'OTHER' && (
                          <input
                            type="text"
                            className={fieldCls}
                            placeholder="Enter your country name…"
                            value={customCountry}
                            onChange={(e) => setCustomCountry(e.target.value)}
                            autoFocus
                          />
                        )}
                      </div>
                    </FieldRow>

                    {/* ── Date Format ── */}
                    <FieldRow label="* Date Format:">
                      <select className={fieldCls} value={appForm.dateFormat}
                        onChange={(e) => setAppForm({ ...appForm, dateFormat: e.target.value })}>
                        {DATE_FORMATS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </FieldRow>

                    {/* ── Email ── */}
                    <FieldRow label="* Email:">
                      <input
                        type="email"
                        className={fieldCls}
                        placeholder="admin@yourcompany.com"
                        value={appForm.email}
                        onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
                      />
                    </FieldRow>

                    <div className="flex justify-end pt-5">
                      <Button type="submit" loading={appSaving} icon={<Globe size={14} />}>
                        Save App Settings
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── General Settings ── */}
              {activeSection === 'general' && (
                <div>
                  <SectionHeader title="General Settings" subtitle="Customize your visual preferences and theme" />
                  <div className="space-y-8">
                    {/* Theme */}
                    <div>
                      <p className="text-sm font-medium text-white/70 mb-3">Theme</p>
                      <div className="flex gap-3">
                        {THEMES.map(({ id, label, icon }) => (
                          <button key={id} type="button" onClick={() => { setTheme(id); updateMutation.mutate({ theme: id }); }}
                            className={cn(
                              'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                              theme === id
                                ? 'border-accent-50 bg-accent-10 text-accent-muted'
                                : 'border-border bg-surface-tertiary text-gray-400 hover:border-border-strong'
                            )}>
                            {icon}
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accent color */}
                    <div>
                      <p className="text-sm font-medium text-white/70 mb-3">Accent Color</p>
                      <div className="flex gap-3 flex-wrap">
                        {ACCENT_COLORS.map(({ id, label, hex }) => (
                          <button key={id} type="button" title={label}
                            onClick={() => { setAccentColor(id); updateMutation.mutate({ accentColor: id }); }}
                            className={cn(
                              'w-9 h-9 rounded-full transition-all',
                              accentColor === id ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-secondary scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                            )}
                            style={{ backgroundColor: hex }} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Active: <span className="text-accent-muted font-medium capitalize">{accentColor}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Company Settings ── */}
              {activeSection === 'company' && (
                <div>
                  <SectionHeader title="Company Settings" subtitle="Update your company information" />
                  <form onSubmit={handleCompanySave} className="space-y-0">
                    <FieldRow label="Company Name:">
                      <input className={fieldCls} placeholder="Your Company Name"
                        value={companyForm.companyName}
                        onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Address:">
                      <input className={fieldCls} placeholder="Street address"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="City:">
                      <input className={fieldCls} placeholder="City"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company State:">
                      <input className={fieldCls} placeholder="State / Province"
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="ZIP / Postal Code:">
                      <input className={fieldCls} placeholder="ZIP / Postal Code"
                        value={companyForm.zipCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Country:">
                      <select className={fieldCls} value={companyForm.country}
                        onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}>
                        <option value="IN">🇮🇳 India</option>
                        <option value="US">🇺🇸 United States</option>
                        <option value="AE">🇦🇪 UAE</option>
                        <option value="GB">🇬🇧 United Kingdom</option>
                        <option value="AU">🇦🇺 Australia</option>
                        <option value="SA">🇸🇦 Saudi Arabia</option>
                        <option value="QA">🇶🇦 Qatar</option>
                        <option value="OTHER">🌍 Other</option>
                      </select>
                    </FieldRow>
                    <FieldRow label="Company Email:">
                      <input className={fieldCls} type="email" placeholder="company@example.com"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Phone:">
                      <input className={fieldCls} placeholder="+1 234 567 8901"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Website:">
                      <input className={fieldCls} placeholder="www.example.com"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Tax Number:">
                      <input className={fieldCls} placeholder="Tax / GST number"
                        value={companyForm.taxNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Vat Number:">
                      <input className={fieldCls} placeholder="VAT number"
                        value={companyForm.vatNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, vatNumber: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Company Reg Number:">
                      <input className={fieldCls} placeholder="Company registration number"
                        value={companyForm.regNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, regNumber: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Footer Address:">
                      <input className={fieldCls} placeholder="Full address for PDF footer"
                        value={companyForm.footerAddress}
                        onChange={(e) => setCompanyForm({ ...companyForm, footerAddress: e.target.value })} />
                    </FieldRow>

                    <div className="flex justify-end pt-5">
                      <Button type="submit" loading={companySaving} icon={<Building2 size={14} />}>
                        Save Company Settings
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Company Logo ── */}
              {activeSection === 'logo' && (
                <div>
                  <SectionHeader title="Company Logo" subtitle="Upload your logo — used in PDF quotes, invoices and reports" />
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Preview */}
                    <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-surface-secondary overflow-hidden shrink-0">
                      {companyLogoPreview
                        ? <img src={companyLogoPreview} alt="Logo" className="w-full h-full object-contain p-3" />
                        : <Building2 size={36} className="text-gray-600" />}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-white/60">PNG, JPG or SVG · Max 2MB</p>
                      <p className="text-xs text-gray-500">Your logo will appear on all generated PDFs — quotes, invoices, and purchase orders.</p>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      <div className="flex gap-2 flex-wrap">
                        <Button type="button" variant="outline" icon={<Upload size={13} />}
                          onClick={() => logoInputRef.current?.click()}>
                          Upload Logo
                        </Button>
                        {companyLogoPreview && (
                          <Button type="button" variant="ghost" onClick={() => setCompanyLogoPreview('')}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Currency & Finance ── */}
              {activeSection === 'currency' && (
                <div>
                  <SectionHeader title="Currency & Finance Settings" subtitle="Financial year and default currency for quotes and invoices" />
                  <form onSubmit={handleCompanySave} className="space-y-0">
                    <FieldRow label="Default Currency:">
                      <select className={fieldCls} value={companyForm.currency}
                        onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}>
                        {['INR','USD','EUR','GBP','AED','SAR','QAR','AUD','CAD','SGD','JPY'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </FieldRow>
                    <FieldRow label="Financial Year Start:">
                      <select className={fieldCls} value={companyForm.financialYearStart}
                        onChange={(e) => setCompanyForm({ ...companyForm, financialYearStart: e.target.value })}>
                        <option value="01">January (Jan–Dec)</option>
                        <option value="04">April (Apr–Mar) — India</option>
                        <option value="07">July (Jul–Jun) — Australia</option>
                        <option value="10">October (Oct–Sep)</option>
                      </select>
                    </FieldRow>
                    <div className="flex justify-end pt-5">
                      <Button type="submit" loading={companySaving} icon={<DollarSign size={14} />}>
                        Save Currency Settings
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Module Visibility ── */}
              {activeSection === 'products' && (
                <div>
                  <SectionHeader title="Product Configuration" subtitle="Manage Category → Group → Product with value" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input className={fieldCls} placeholder="Category (e.g. Software)"
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
                      <input className={fieldCls} placeholder="Group (e.g. Healthcare)"
                        value={productForm.group}
                        onChange={(e) => setProductForm({ ...productForm, group: e.target.value })} />
                      <input className={fieldCls} placeholder="Product (e.g. Hospital System)"
                        value={productForm.product}
                        onChange={(e) => setProductForm({ ...productForm, product: e.target.value })} />
                      <div className="flex gap-2">
                        <input className={fieldCls} type="number" min={0} placeholder="Value"
                          value={productForm.value}
                          onChange={(e) => setProductForm({ ...productForm, value: e.target.value })} />
                        <Button type="button" size="sm" icon={<Plus size={14} />} onClick={addConfiguredProduct}>Add</Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {productCategories.length === 0 && (
                        <p className="text-sm text-gray-500">No products configured yet.</p>
                      )}
                      {productCategories.map((category) => (
                        <div key={category.name} className="rounded-xl border border-border bg-surface-secondary p-3 space-y-2">
                          <p className="text-sm font-semibold text-white">{category.name}</p>
                          {category.groups.map((group) => (
                            <div key={`${category.name}-${group.name}`} className="rounded-lg border border-border/60 p-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{group.name}</p>
                              <div className="space-y-1">
                                {group.products.map((product) => (
                                  <div key={`${category.name}-${group.name}-${product.name}`} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-200">{product.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-400 font-medium">{product.value}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeConfiguredProduct(category.name, group.name, product.name)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" loading={productsSaving} onClick={saveConfiguredProducts} icon={<Settings size={14} />}>
                        Save Product Configuration
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'modules' && (
                <div>
                  <SectionHeader title="Module Visibility" subtitle="Choose which modules appear in your sidebar" />
                  <ModuleSelector
                    selectedModules={
                      Array.isArray(prefs?.selectedModules) && prefs!.selectedModules.length > 0
                        ? prefs!.selectedModules
                        : ['leads', 'contacts', 'deals', 'tasks', 'pipeline', 'reports']
                    }
                    onSave={(modules) => updateMutation.mutate({ selectedModules: modules })}
                    isLoading={updateMutation.isPending}
                  />
                </div>
              )}

              {/* ── Pipeline Stages ── */}
              {activeSection === 'pipeline' && (
                <div>
                  <SectionHeader title="Pipeline Stages" subtitle="Define custom stages for your sales pipeline" />
                  <div className="space-y-3">
                    {pipelineStages.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-6">No custom stages yet — add one below.</p>
                    )}
                    {pipelineStages.map((stage: any) => (
                      <div key={stage.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-secondary">
                        <GripVertical size={16} className="text-gray-600 cursor-grab shrink-0" />
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />
                        <input value={stage.name}
                          onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                        <input type="color" value={stage.color || '#6366f1'}
                          onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                          className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent" />
                        <input type="number" min={0} max={100} value={stage.defaultProbability || 0}
                          onChange={(e) => updateStage(stage.id, { defaultProbability: parseInt(e.target.value) })}
                          className="w-14 bg-surface-secondary border border-border rounded-lg px-2 py-1 text-xs text-gray-300 text-center focus:outline-none"
                          title="Default probability %" />
                        <span className="text-xs text-gray-600">%</span>
                        <button type="button" onClick={() => deleteStage(stage.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Add new */}
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border">
                      <input type="color" value={newStageColor}
                        onChange={(e) => setNewStageColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent shrink-0" />
                      <input value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addStage()}
                        placeholder="Stage name (e.g. Site Visit, Demo)…"
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
                      <Button size="sm" onClick={addStage} disabled={stagesSaving || !newStageName.trim()} icon={<Plus size={14} />}>
                        Add
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 px-1">
                      Stages appear in the Pipeline Kanban board. The % is auto-filled when a deal enters that stage.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Notifications ── */}
              {activeSection === 'notifications' && (
                <div>
                  <SectionHeader title="Notifications" subtitle="Configure how you receive alerts and reminders" />
                  <div className="space-y-2">
                    {[
                      { key: 'email',   label: 'Email Notifications',  desc: 'Receive updates via email' },
                      { key: 'push',    label: 'Push Notifications',    desc: 'Browser push notifications' },
                      { key: 'desktop', label: 'Desktop Alerts',        desc: 'Show desktop notification banners' },
                    ].map((item) => (
                      <div key={item.key}
                        className="flex items-center justify-between p-4 rounded-xl bg-surface-tertiary border border-border">
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <button
                          className="relative inline-flex w-10 h-5 rounded-full bg-accent transition-colors"
                          role="switch" aria-checked="true">
                          <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Security ── */}
              {activeSection === 'security' && (
                <div>
                  <SectionHeader title="Security" subtitle="Manage your account security and sessions" />
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                      <Shield size={18} className="text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">Account Secured</p>
                        <p className="text-xs text-gray-400">Protected with JWT authentication and bcrypt password hashing</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-tertiary border border-border">
                        <div>
                          <p className="text-sm font-medium text-white">Active Sessions</p>
                          <p className="text-xs text-gray-500">Manage where you're logged in</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsSessionsModalOpen(true)}>
                          View Sessions
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-tertiary border border-border">
                        <div>
                          <p className="text-sm font-medium text-white">Change Password</p>
                          <p className="text-xs text-gray-500">Update your account password</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setIsPasswordModalOpen(true)}>
                          Update
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-tertiary border border-border text-xs text-gray-500 space-y-1">
                      <p>Last login: <span className="text-gray-300">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</span></p>
                      <p>Account created: <span className="text-gray-300">{user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</span></p>
                    </div>
                  </div>
                </div>
              )}

            </Card>
          </motion.div>
        </div>

        {/* ── Right nav panel ── */}
        <div className="lg:w-56 w-full shrink-0">
          <div className="bg-surface-secondary border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Settings</p>
            </div>
            <nav className="p-1.5">
              {NAV_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all group',
                    activeSection === sec.id
                      ? 'bg-accent text-white font-medium'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={activeSection === sec.id ? 'text-white' : 'text-white/30 group-hover:text-white/60'}>
                      {sec.icon}
                    </span>
                    {sec.label}
                  </span>
                  <ChevronRight size={13} className={cn(
                    'shrink-0 transition-opacity',
                    activeSection === sec.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  )} />
                </button>
              ))}
            </nav>
          </div>
        </div>

      </div>

      {/* ── Change Password Modal ── */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setPasswordForm({ current: '', next: '', confirm: '' }); }} title="Change Password" size="sm">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input label="Current Password" type="password" required
            value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} />
          <Input label="New Password" type="password" required
            value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} />
          <Input label="Confirm New Password" type="password" required
            value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={passwordLoading} icon={<Lock size={14} />}>Update Password</Button>
          </div>
        </form>
      </Modal>

      {/* ── Active Sessions Modal ── */}
      <Modal isOpen={isSessionsModalOpen} onClose={() => setIsSessionsModalOpen(false)} title="Active Sessions" size="sm">
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-surface-tertiary border border-accent-20">
            <div className="flex items-start gap-3">
              <Monitor size={16} className="text-accent-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Current Session</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{navigator.userAgent.split('(')[0].trim()}</p>
                <p className="text-xs text-gray-500 mt-1">Signed in as <span className="text-gray-300">{user?.email}</span></p>
                {user?.lastLoginAt && (
                  <p className="text-xs text-gray-500 mt-0.5">Since {new Date(user.lastLoginAt).toLocaleString()}</p>
                )}
              </div>
              <span className="text-xs text-green-400 font-medium shrink-0">Active</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">Only one active session detected.</p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsSessionsModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
