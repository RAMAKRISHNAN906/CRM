import api from './api';
import { ApiResponse, ProductCategory, SettingsProductsPayload } from '../types';


export const settingsProductsService = {
  get: async (): Promise<SettingsProductsPayload> => {
    const res = await api.get<ApiResponse<SettingsProductsPayload>>('/settings/products');
    return res.data.data;
  },

  update: async (categories: ProductCategory[]): Promise<SettingsProductsPayload> => {
    const res = await api.put<ApiResponse<SettingsProductsPayload>>('/settings/products', { categories });
    return res.data.data;
  },
};
