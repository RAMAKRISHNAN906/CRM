import api from './api';
import { ApiResponse, DashboardStats } from '../types';

export const dashboardService = {
  getStats: async () => {
    const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return res.data.data;
  },

  getActivity: async (page = 1, limit = 20) => {
    const res = await api.get(`/dashboard/activity?page=${page}&limit=${limit}`);
    return res.data.data;
  },
};
