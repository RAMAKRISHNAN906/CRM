import api from './api';
import { Task, PaginatedResponse, ApiResponse } from '../types';

export const tasksService = {
  getAll: async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.append(k, String(v)));
    const res = await api.get<PaginatedResponse<Task>>(`/tasks?${params}`);
    return res.data;
  },

  getOne: async (id: string) => {
    const res = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Task>) => {
    const res = await api.post<ApiResponse<Task>>('/tasks', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Task>) => {
    const res = await api.put<ApiResponse<Task>>(`/tasks/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/tasks/${id}`);
  },
};
