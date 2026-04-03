import api from './api';

export interface FestivalCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
}

export interface Festival {
  id: string;
  name: string;
  emoji: string;
  date: string;
  country: string;
  isRecurring: boolean;
  sendDaysBefore: number;
  isAutoSend: boolean;
  targetAll: boolean;
  targetTags: string[];
  messages: FestivalMessage[];
  _count?: { sendLogs: number };
  scheduledAt?: string | null;
  whatsappMessage?: string | null;
  emailSubject?: string | null;
  emailMessage?: string | null;
  isSent: boolean;
}

export interface FestivalMessage {
  id: string;
  festivalId: string;
  language: string;
  messageTemplate: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  isActive: boolean;
}

export interface FestivalSendLog {
  id: string;
  channel: string;
  status: string;
  messageBody: string;
  sentAt: string;
  year: number;
  contactId: string;
  contact?: { id: string; firstName: string; lastName: string; email?: string; phone?: string } | null;
}

export interface FestivalStats {
  total: number;
  upcoming: number;
  totalSent: number;
  autoEnabled: number;
  scheduledCount: number;
  customerCount: number;
  nextFestival?: { name: string; date: string; emoji: string } | null;
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  whatsappProvider: string;
}

export interface SendResult {
  emailSent: number;
  whatsappSent: number;
  failed: number;
  total: number;
}

export const festivalsService = {
  getStats: async (): Promise<FestivalStats> => {
    const res = await api.get('/festivals/stats');
    return res.data.data;
  },

  getAll: async (): Promise<Festival[]> => {
    const res = await api.get('/festivals');
    return res.data.data;
  },

  create: async (data: Partial<Festival>): Promise<Festival> => {
    const res = await api.post('/festivals', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Festival>): Promise<Festival> => {
    const res = await api.put(`/festivals/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/festivals/${id}`);
  },

  // Global customers
  getCustomers: async (): Promise<FestivalCustomer[]> => {
    const res = await api.get('/festivals/customers');
    return res.data.data;
  },

  addCustomer: async (data: { name: string; phone?: string; email?: string }): Promise<FestivalCustomer> => {
    const res = await api.post('/festivals/customers', data);
    return res.data.data;
  },

  deleteCustomer: async (customerId: string): Promise<void> => {
    await api.delete(`/festivals/customers/${customerId}`);
  },

  // Send now (optional custom message)
  sendNow: async (festivalId: string, message?: string): Promise<SendResult> => {
    const res = await api.post(`/festivals/${festivalId}/send-now`, { message: message || '' });
    return res.data.data;
  },

  // Schedule auto-send
  schedule: async (festivalId: string, scheduledAt: string, message?: string): Promise<Festival> => {
    const res = await api.post(`/festivals/${festivalId}/schedule`, { scheduledAt, message: message || '' });
    return res.data.data;
  },

  getLogs: async (festivalId: string): Promise<FestivalSendLog[]> => {
    const res = await api.get(`/festivals/${festivalId}/logs`);
    return res.data.data;
  },

  addMessage: async (festivalId: string, data: Partial<FestivalMessage>): Promise<FestivalMessage> => {
    const res = await api.post(`/festivals/${festivalId}/messages`, data);
    return res.data.data;
  },

  deleteMessage: async (msgId: string): Promise<void> => {
    await api.delete(`/festivals/messages/${msgId}`);
  },

  preview: async (festivalId: string, language: string, channel: string): Promise<{ preview: string; template: string }> => {
    const res = await api.post(`/festivals/${festivalId}/preview`, { language, channel });
    return res.data.data;
  },

  sendGreetings: async (festivalId: string): Promise<{ sent: number; skipped: number; failed: number }> => {
    const res = await api.post(`/festivals/${festivalId}/send`);
    return res.data.data;
  },
};
