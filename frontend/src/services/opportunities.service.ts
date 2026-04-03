import api from './api';

const BASE = '/opportunities';

export const opportunitiesService = {
  list:    (params?: any)           => api.get(BASE, { params }),
  get:     (id: string)             => api.get(`${BASE}/${id}`),
  create:  (data: any)              => api.post(BASE, data),
  update:  (id: string, data: any)  => api.put(`${BASE}/${id}`, data),
  stage:   (id: string, stage: string, lostReason?: string) =>
    api.patch(`${BASE}/${id}/stage`, { stage, lostReason }),
  delete:  (id: string)             => api.delete(`${BASE}/${id}`),
  stats:   ()                       => api.get(`${BASE}/stats`),
  kanban:  ()                       => api.get(`${BASE}/kanban`),
};
