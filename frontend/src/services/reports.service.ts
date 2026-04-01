import api from './api';
import { ApiResponse } from '../types';

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export const reportsService = {
  getSalesFunnel: async (filters: DateRangeFilter = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/funnel?${params}`);
    return res.data.data;
  },

  getRevenue: async (filters: DateRangeFilter & { groupBy?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/revenue?${params}`);
    return res.data.data;
  },

  getLeadSources: async (filters: DateRangeFilter = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/lead-sources?${params}`);
    return res.data.data;
  },

  getTeamPerformance: async (filters: DateRangeFilter = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/team-performance?${params}`);
    return res.data.data;
  },

  getConversion: async (filters: DateRangeFilter = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/conversion?${params}`);
    return res.data.data;
  },

  getActivity: async (filters: DateRangeFilter & { entity?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await api.get<ApiResponse<any>>(`/reports/activity?${params}`);
    return res.data.data;
  },
};
