import api from './api';
import { PaginatedResponse, ApiResponse } from '../types';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  tags: string[];
  slaDeadline?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  contact?: { id: string; firstName: string; lastName: string; email?: string };
  assignee?: { id: string; name: string; avatar?: string };
  reporter?: { id: string; name: string; avatar?: string };
  communications?: any[];
  statusHistory?: any[];
  _count?: { communications: number };
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  overdueSla: number;
}

export const ticketsService = {
  getAll: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Ticket>>(`/tickets?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Ticket>>(`/tickets/${id}`);
    return res.data.data;
  },

  getStats: async () => {
    const res = await api.get<ApiResponse<TicketStats>>('/tickets/stats');
    return res.data.data;
  },

  create: async (data: Partial<Ticket>) => {
    const res = await api.post<ApiResponse<Ticket>>('/tickets', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Ticket>) => {
    const res = await api.put<ApiResponse<Ticket>>(`/tickets/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/tickets/${id}`);
  },
};
