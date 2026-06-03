import api from './api';
import { ApiResponse, ProductCategory, SettingsProductsPayload } from '../types';

const SETTINGS_PRODUCTS_CACHE_KEY = 'nexuscrm_settings_products_cache';

const readCachedProducts = (): SettingsProductsPayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_PRODUCTS_CACHE_KEY);
    return raw ? JSON.parse(raw) as SettingsProductsPayload : null;
  } catch {
    return null;
  }
};

const writeCachedProducts = (payload: SettingsProductsPayload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_PRODUCTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};

export const settingsProductsService = {
  get: async (): Promise<SettingsProductsPayload> => {
    try {
      const res = await api.get<ApiResponse<SettingsProductsPayload>>('/settings/products');
      const payload = res.data.data;
      writeCachedProducts(payload);
      return payload;
    } catch (error: any) {
      const cached = readCachedProducts();
      if (cached) return cached;
      throw error;
    }
  },

  update: async (categories: ProductCategory[]): Promise<SettingsProductsPayload> => {
    const payload = { categories, products: categories.flatMap((category) =>
      category.groups.flatMap((group) =>
        group.products.map((product) => ({
          id: product.id,
          category: category.name,
          group: group.name,
          name: product.name,
          value: Number(product.value || 0),
        }))
      )
    ) };

    try {
      const res = await api.put<ApiResponse<SettingsProductsPayload>>('/settings/products', { categories });
      const next = res.data.data;
      writeCachedProducts(next);
      return next;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404 || status === 405 || status === 501) {
        writeCachedProducts(payload);
        return payload;
      }
      throw error;
    }
  },
};
