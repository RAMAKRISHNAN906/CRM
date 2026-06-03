export const LEAD_STATUS_VALUES = ['COLD', 'WARM', 'HOT', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUS_VALUES)[number];

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  COLD: 'Cold',
  WARM: 'Warm',
  HOT: 'Hot',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

export const LEAD_STATUS_FLOW_ORDER: Record<LeadStatus, number> = {
  COLD: 0,
  WARM: 1,
  HOT: 2,
  CONVERTED: 3,
  LOST: 4,
};

const LEGACY_LEAD_STATUS_MAP: Record<string, LeadStatus> = {
  NEW: 'COLD',
  CONTACTED: 'WARM',
  QUALIFIED: 'HOT',
  PROPOSAL: 'HOT',
  NEGOTIATION: 'HOT',
  WON: 'CONVERTED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
  DISQUALIFIED: 'LOST',
};

const PERSISTED_LEAD_STATUS_MAP: Record<LeadStatus, string> = {
  COLD: 'NEW',
  WARM: 'CONTACTED',
  HOT: 'QUALIFIED',
  CONVERTED: 'WON',
  LOST: 'LOST',
};

const LEGACY_LEAD_STATUS_FILTERS: Record<LeadStatus, string[]> = {
  COLD: ['NEW'],
  WARM: ['CONTACTED'],
  HOT: ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION'],
  CONVERTED: ['WON', 'CONVERTED'],
  LOST: ['LOST'],
};

export const normalizeLeadStatus = (value?: unknown): LeadStatus | null => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return null;
  if (LEAD_STATUS_VALUES.includes(normalized as LeadStatus)) return normalized as LeadStatus;
  return LEGACY_LEAD_STATUS_MAP[normalized] ?? null;
};

export const coerceLeadStatus = (value?: unknown, fallback: LeadStatus = 'COLD'): LeadStatus => {
  return normalizeLeadStatus(value) ?? fallback;
};

export const isConvertedLead = (value?: unknown): boolean => coerceLeadStatus(value) === 'CONVERTED';

export const formatLeadStatusLabel = (value?: unknown): string => {
  const status = coerceLeadStatus(value);
  return LEAD_STATUS_LABELS[status];
};

export const toPersistedLeadStatus = (value?: unknown, fallback: LeadStatus = 'COLD'): LeadStatus => {
  const status = coerceLeadStatus(value, fallback);
  return PERSISTED_LEAD_STATUS_MAP[status] as LeadStatus;
};

export const toPersistedLeadStatusFilter = (value?: unknown): string[] | null => {
  const status = normalizeLeadStatus(value);
  if (!status) return null;
  return LEGACY_LEAD_STATUS_FILTERS[status] || [PERSISTED_LEAD_STATUS_MAP[status]];
};
