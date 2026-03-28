import api from './api';
import { ApiResponse, Preference } from '../types';

export const preferencesService = {
  get: async () => {
    const res = await api.get<ApiResponse<Preference>>('/preferences');
    return res.data.data;
  },

  update: async (data: Partial<Preference>) => {
    const res = await api.put<ApiResponse<Preference>>('/preferences', data);
    return res.data.data;
  },
};
