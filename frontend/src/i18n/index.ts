/**
 * NexusCRM i18n System
 * Key-based translations with RTL support for Arabic
 *
 * Usage:
 *   import { useI18n } from '../i18n';
 *   const { t, dir, lang, setLang } = useI18n();
 *   <div dir={dir}>{t('leads.title')}</div>
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Translation Keys ──────────────────────────────────────────────────────
type TranslationMap = Record<string, string>;

const translations: Record<string, TranslationMap> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.leads': 'Leads',
    'nav.contacts': 'Contacts',
    'nav.deals': 'Deals',
    'nav.pipeline': 'Pipeline',
    'nav.tasks': 'Tasks',
    'nav.reports': 'Reports',
    'nav.quotes': 'Quotes',
    'nav.invoices': 'Invoices',
    'nav.tickets': 'Tickets',
    'nav.automation': 'Automation',
    'nav.festivals': 'Festivals',
    'nav.settings': 'Settings',
    'nav.team': 'Team',
    'nav.accounts': 'Accounts',

    'leads.title': 'Leads',
    'leads.subtitle': 'Manage your sales leads',
    'leads.new': 'New Lead',
    'leads.empty': 'No leads yet. Create your first lead.',

    'deals.title': 'Deals',
    'deals.new': 'New Deal',

    'quotes.title': 'Quotations',
    'quotes.new': 'New Quote',
    'quotes.types.SQ': 'Sales Quote',
    'quotes.types.SO': 'Sales Order',
    'quotes.types.SI': 'Sales Invoice',
    'quotes.types.SCR': 'Credit Memo',

    'tasks.title': 'Tasks',
    'tasks.new': 'New Task',
    'tasks.subtasks': 'Subtasks',
    'tasks.progress': 'Progress',

    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.total': 'Total',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.createdAt': 'Created',
  },

  ar: {
    'nav.dashboard': 'لوحة القيادة',
    'nav.leads': 'العملاء المحتملون',
    'nav.contacts': 'جهات الاتصال',
    'nav.deals': 'الصفقات',
    'nav.pipeline': 'خط الأنابيب',
    'nav.tasks': 'المهام',
    'nav.reports': 'التقارير',
    'nav.quotes': 'عروض الأسعار',
    'nav.invoices': 'الفواتير',
    'nav.tickets': 'التذاكر',
    'nav.automation': 'الأتمتة',
    'nav.festivals': 'المناسبات',
    'nav.settings': 'الإعدادات',
    'nav.team': 'الفريق',
    'nav.accounts': 'الحسابات',

    'leads.title': 'العملاء المحتملون',
    'leads.subtitle': 'إدارة العملاء المحتملين',
    'leads.new': 'عميل محتمل جديد',
    'leads.empty': 'لا يوجد عملاء محتملون. أنشئ أول عميل.',

    'deals.title': 'الصفقات',
    'deals.new': 'صفقة جديدة',

    'quotes.title': 'عروض الأسعار',
    'quotes.new': 'عرض سعر جديد',
    'quotes.types.SQ': 'عرض سعر',
    'quotes.types.SO': 'أمر بيع',
    'quotes.types.SI': 'فاتورة مبيعات',
    'quotes.types.SCR': 'إشعار دائن',

    'tasks.title': 'المهام',
    'tasks.new': 'مهمة جديدة',
    'tasks.subtasks': 'المهام الفرعية',
    'tasks.progress': 'التقدم',

    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.loading': 'جار التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.total': 'الإجمالي',
    'common.status': 'الحالة',
    'common.actions': 'الإجراءات',
    'common.createdAt': 'تاريخ الإنشاء',
  },

  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.leads': 'Prospects',
    'nav.contacts': 'Contacts',
    'nav.deals': 'Affaires',
    'nav.pipeline': 'Pipeline',
    'nav.tasks': 'Tâches',
    'nav.reports': 'Rapports',
    'nav.quotes': 'Devis',
    'nav.invoices': 'Factures',
    'nav.tickets': 'Tickets',
    'nav.automation': 'Automatisation',
    'nav.festivals': 'Fêtes',
    'nav.settings': 'Paramètres',
    'nav.team': 'Équipe',
    'nav.accounts': 'Comptes',

    'leads.title': 'Prospects',
    'leads.new': 'Nouveau prospect',
    'leads.empty': 'Aucun prospect. Créez le premier.',
    'leads.subtitle': 'Gérez vos prospects commerciaux',

    'deals.title': 'Affaires',
    'deals.new': 'Nouvelle affaire',

    'quotes.title': 'Devis',
    'quotes.new': 'Nouveau devis',
    'quotes.types.SQ': 'Devis commercial',
    'quotes.types.SO': 'Bon de commande',
    'quotes.types.SI': 'Facture de vente',
    'quotes.types.SCR': 'Note de crédit',

    'tasks.title': 'Tâches',
    'tasks.new': 'Nouvelle tâche',
    'tasks.subtasks': 'Sous-tâches',
    'tasks.progress': 'Progression',

    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée',
    'common.total': 'Total',
    'common.status': 'Statut',
    'common.actions': 'Actions',
    'common.createdAt': 'Créé le',
  },

  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.leads': 'लीड्स',
    'nav.contacts': 'संपर्क',
    'nav.deals': 'सौदे',
    'nav.pipeline': 'पाइपलाइन',
    'nav.tasks': 'कार्य',
    'nav.reports': 'रिपोर्ट',
    'nav.quotes': 'कोटेशन',
    'nav.invoices': 'चालान',
    'nav.tickets': 'टिकट',
    'nav.automation': 'स्वचालन',
    'nav.festivals': 'त्योहार',
    'nav.settings': 'सेटिंग्स',
    'nav.team': 'टीम',
    'nav.accounts': 'खाते',

    'leads.title': 'लीड्स',
    'leads.new': 'नई लीड',
    'leads.empty': 'कोई लीड नहीं। पहली लीड बनाएं।',
    'leads.subtitle': 'अपनी लीड्स प्रबंधित करें',

    'deals.title': 'सौदे',
    'deals.new': 'नया सौदा',

    'quotes.title': 'कोटेशन',
    'quotes.new': 'नया कोटेशन',
    'quotes.types.SQ': 'सेल्स कोट',
    'quotes.types.SO': 'सेल्स ऑर्डर',
    'quotes.types.SI': 'सेल्स इनवॉइस',
    'quotes.types.SCR': 'क्रेडिट मेमो',

    'tasks.title': 'कार्य',
    'tasks.new': 'नया कार्य',
    'tasks.subtasks': 'उप-कार्य',
    'tasks.progress': 'प्रगति',

    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.loading': 'लोड हो रहा है...',
    'common.noData': 'कोई डेटा नहीं',
    'common.total': 'कुल',
    'common.status': 'स्थिति',
    'common.actions': 'क्रियाएं',
    'common.createdAt': 'बनाया गया',
  },
};

// ── RTL languages ─────────────────────────────────────────────────────────
const RTL_LANGS = new Set(['ar', 'ur', 'he', 'fa']);

interface I18nState {
  lang: string;
  setLang: (lang: string) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => {
        set({ lang });
        // Apply RTL to document
        document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      },
    }),
    { name: 'crm-lang' }
  )
);

// ── Hook ──────────────────────────────────────────────────────────────────
export function useI18n() {
  const { lang, setLang } = useI18nStore();
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';

  const t = (key: string, fallback?: string): string => {
    const map = translations[lang] ?? translations['en'];
    return map[key] ?? translations['en'][key] ?? fallback ?? key;
  };

  return { t, dir, lang, setLang, isRTL: dir === 'rtl' };
}

// LanguageSwitcher component lives in ./LanguageSwitcher.tsx (JSX requires .tsx)
