import api from './api';

export type ActivityChannel = 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'SMS' | 'MEETING' | 'NOTE';
export type ActivityStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Activity {
  id: string;
  channel: ActivityChannel;
  subject: string;
  body?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  duration?: number;
  meetingLink?: string;
  meetingSummary?: string;
  nextAction?: string;
  activityStatus?: ActivityStatus;
  metadata?: Record<string, any>;
  contactId?: string;
  dealId?: string;
  leadId?: string;
  contact?: { id: string; firstName: string; lastName: string; company?: string } | null;
  deal?: { id: string; title: string } | null;
  lead?: { id: string; firstName: string; lastName: string; company?: string } | null;
  user?: { id: string; name: string; avatar?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityStats {
  upcomingMeetings: number;
  completedToday: number;
  pendingActions: number;
  thisWeekTotal: number;
  overdueCount: number;
}

export const activitiesService = {
  getAll: async (filters: Record<string, any> = {}): Promise<{ data: Activity[]; meta: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== '' && params.append(k, String(v)));
    const res = await api.get(`/activities?${params}`);
    return res.data;
  },

  getUpcoming: async (days = 7): Promise<Activity[]> => {
    const res = await api.get(`/activities/upcoming?days=${days}`);
    return res.data.data;
  },

  getStats: async (): Promise<ActivityStats> => {
    const res = await api.get('/activities/stats');
    return res.data.data;
  },

  getOne: async (id: string): Promise<Activity> => {
    const res = await api.get(`/activities/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Activity>): Promise<Activity> => {
    const res = await api.post('/activities', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Activity>): Promise<Activity> => {
    const res = await api.put(`/activities/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/activities/${id}`);
  },
};
