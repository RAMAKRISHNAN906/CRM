import api from './api';
import { Deal, PaginatedResponse, ApiResponse } from '../types';

export const dealsService = {
  getAll: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Deal>>(`/deals?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Deal>>(`/deals/${id}`);
    return res.data.data;
  },

  getPipeline: async () => {
    const res = await api.get<ApiResponse<any[]>>('/deals/pipeline');
    return res.data.data;
  },

  create: async (data: Partial<Deal>) => {
    const res = await api.post<ApiResponse<Deal>>('/deals', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Deal>) => {
    const res = await api.put<ApiResponse<Deal>>(`/deals/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/deals/${id}`);
  },
};
