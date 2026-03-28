import api from './api';
import { Contact, PaginatedResponse, ApiResponse } from '../types';

export const contactsService = {
  getAll: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Contact>>(`/contacts?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Contact>>(`/contacts/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Contact>) => {
    const res = await api.post<ApiResponse<Contact>>('/contacts', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Contact>) => {
    const res = await api.put<ApiResponse<Contact>>(`/contacts/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/contacts/${id}`);
  },
};
