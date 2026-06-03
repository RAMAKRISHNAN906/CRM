import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

const DEFAULT_CURRENCY = 'INR';
const CURRENCY_STORAGE_KEY = 'crm-default-currency';
export const CURRENCY_CHANGE_EVENT = 'crm:currency-changed';

const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'ar-AE',
  SAR: 'ar-SA',
  QAR: 'ar-QA',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  JPY: 'ja-JP',
};

export const getCurrentCurrency = (): string => {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  const raw = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  const normalized = (raw || '').trim().toUpperCase();
  return normalized || DEFAULT_CURRENCY;
};

export const setCurrentCurrency = (currency: string): void => {
  if (typeof window === 'undefined') return;
  const normalized = (currency || '').trim().toUpperCase() || DEFAULT_CURRENCY;
  window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: normalized }));
};

export const getCurrencyLocale = (currency = getCurrentCurrency()): string => {
  const normalized = currency.trim().toUpperCase();
  return CURRENCY_LOCALES[normalized] || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
};

export const getCurrencySymbol = (currency = getCurrentCurrency()): string => {
  try {
    const locale = getCurrencyLocale(currency);
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
};

type CurrencyFormatOptions = Intl.NumberFormatOptions & { locale?: string };

export const formatCurrency = (
  value: number,
  currency = getCurrentCurrency(),
  options?: CurrencyFormatOptions,
): string => {
  const { locale, ...formatOptions } = options || {};
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(locale || getCurrencyLocale(currency), {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      ...formatOptions,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      notation: 'compact',
      maximumFractionDigits: 1,
      ...formatOptions,
    }).format(amount);
  }
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

export const formatDate = (date: string | Date | null | undefined, fmt = 'MMM dd, yyyy'): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, fmt) : '—';
  } catch { return '—'; }
};

export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
  } catch { return '—'; }
};

export const getInitials = (name: string): string => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const truncate = (str: string, length = 50): string => {
  return str.length > length ? `${str.slice(0, length)}...` : str;
};

export const statusColors: Record<string, string> = {
  // Lead statuses
  COLD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  WARM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  HOT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CONVERTED: 'bg-green-500/20 text-green-400 border-green-500/30',
  LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CONTACTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  QUALIFIED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PROPOSAL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  NEGOTIATION: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  WON: 'bg-green-500/20 text-green-400 border-green-500/30',
  DISQUALIFIED: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Deal stages reuse the same badge colors where names overlap.
  PROSPECTING: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  QUALIFICATION: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CLOSED_WON: 'bg-green-500/20 text-green-400 border-green-500/30',
  CLOSED_LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Task priorities
  LOW: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Task status
  TODO: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const stageProgressMap: Record<string, number> = {
  PROSPECTING: 10, QUALIFICATION: 25, PROPOSAL: 50, NEGOTIATION: 75, CLOSED_WON: 100, CLOSED_LOST: 0,
};
