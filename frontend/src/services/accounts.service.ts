import api from './api';
import { PaginatedResponse, ApiResponse } from '../types';

export interface Account {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  revenue?: number;
  currency: string;
  website?: string;
  phone?: string;
  city?: string;
  country?: string;
  description?: string;
  tags: string[];
  createdAt: string;
  _count?: { contacts: number; deals: number; leads: number };
}

export const accountsService = {
  getAll: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Account>>(`/accounts?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Account>>(`/accounts/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Account>) => {
    const res = await api.post<ApiResponse<Account>>('/accounts', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Account>) => {
    const res = await api.put<ApiResponse<Account>>(`/accounts/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/accounts/${id}`);
  },
};
