import { apiClient } from './client';
import type { ApiResponse, Bot } from '../types';

export const botsApi = {
  list: async () => {
    const response = await apiClient.get<ApiResponse<Bot[]>>('/bots');
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Bot>>(`/bots/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string }) => {
    const response = await apiClient.post<ApiResponse<Bot>>('/bots', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
    const response = await apiClient.put<ApiResponse<Bot>>(`/bots/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/bots/${id}`);
    return response.data;
  },

  connectFacebook: async (id: string, data: { pageId: string; accessToken: string }) => {
    const response = await apiClient.post<ApiResponse<Bot>>(`/bots/${id}/connect-facebook`, data);
    return response.data;
  },
};
