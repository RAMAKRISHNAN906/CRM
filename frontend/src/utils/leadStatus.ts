export const LEAD_STATUS_VALUES = ['COLD', 'WARM', 'HOT', 'CONVERTED', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUS_VALUES)[number];

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  COLD: 'Cold',
  WARM: 'Warm',
  HOT: 'Hot',
  CONVERTED: 'Converted',
  LOST: 'Lost',
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

export const LEAD_STATUS_OPTIONS = LEAD_STATUS_VALUES.map((value) => ({
  value,
  label: LEAD_STATUS_LABELS[value],
}));

export const LEAD_STATUS_FLOW: Record<LeadStatus, number> = {
  COLD: 10,
  WARM: 35,
  HOT: 70,
  CONVERTED: 100,
  LOST: 0,
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

export const formatLeadStatusLabel = (value?: unknown): string => {
  const status = coerceLeadStatus(value);
  return LEAD_STATUS_LABELS[status];
};
