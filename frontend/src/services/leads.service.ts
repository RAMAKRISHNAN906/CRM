import api from './api';
import { Lead, PaginatedResponse, ApiResponse } from '../types';

export interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  viewRole?: 'sales_person' | 'sales_incharge' | 'sales_head';
}

export interface LeadProductSuggestion {
  id: number;
  category: string;
  group: string;
  name: string;
  value: number;
  usageCount: number;
  averageExpectedAmount: number;
  lastUsedAt?: string | null;
}

export const leadsService = {
  getAll: async (filters: LeadFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Lead>>(`/leads?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
    return res.data.data;
  },

  getProductSuggestions: async (filters: { category?: string; group?: string; limit?: number; excludeLeadId?: string | number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const key = k === 'excludeLeadId' ? 'excludeLeadId' : k;
        params.append(key, String(v));
      }
    });
    const res = await api.get<ApiResponse<LeadProductSuggestion[]>>(`/leads/product-suggestions?${params}`);
    return res.data.data;
  },

  create: async (data: Partial<Lead>) => {
    const res = await api.post<ApiResponse<Lead>>('/leads', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Lead>) => {
    const res = await api.put<ApiResponse<Lead>>(`/leads/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/leads/${id}`);
  },
};
