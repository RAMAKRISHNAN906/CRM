import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export const formatCurrency = (value: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
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
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CONTACTED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  QUALIFIED: 'bg-accent-20 text-accent-muted border-accent-30',
  WON: 'bg-green-500/20 text-green-400 border-green-500/30',
  LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Deal stages
  PROSPECTING: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  QUALIFICATION: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROPOSAL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  NEGOTIATION: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
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
