import api from './api';
import { ApiResponse, AuthResponse, User } from '../types';

export const authService = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return res.data.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return res.data.data;
  },

  logout: async (refreshToken: string) => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  refresh: async (refreshToken: string) => {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
    return res.data.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await api.post<ApiResponse<null>>('/auth/change-password', data);
    return res.data;
  },
};
