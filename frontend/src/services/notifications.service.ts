import api from './api';
import { ApiResponse } from '../types';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export const notificationsService = {
  getAll: async (filters: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<ApiResponse<NotificationsResponse>>(`/notifications?${params}`);
    return res.data.data;
  },

  markAsRead: async (ids?: string[]) => {
    await api.post('/notifications/read', { ids });
  },

  delete: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
