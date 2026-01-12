import { apiClient } from './client';
import type { ApiResponse, Broadcast, BroadcastMessage } from '../types';

interface CreateBroadcastData {
  name: string;
  message: BroadcastMessage;
  targetFilter?: {
    tags?: string[];
    isSubscribed?: boolean;
  };
}

interface UpdateBroadcastData {
  name?: string;
  message?: BroadcastMessage;
  targetFilter?: {
    tags?: string[];
    isSubscribed?: boolean;
  };
}

export const broadcastsApi = {
  list: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<Broadcast[]>>(`/bots/${botId}/broadcasts`);
    return response.data;
  },

  get: async (botId: string, broadcastId: string) => {
    const response = await apiClient.get<ApiResponse<Broadcast>>(`/bots/${botId}/broadcasts/${broadcastId}`);
    return response.data;
  },

  create: async (botId: string, data: CreateBroadcastData) => {
    const response = await apiClient.post<ApiResponse<Broadcast>>(`/bots/${botId}/broadcasts`, data);
    return response.data;
  },

  update: async (botId: string, broadcastId: string, data: UpdateBroadcastData) => {
    const response = await apiClient.put<ApiResponse<Broadcast>>(
      `/bots/${botId}/broadcasts/${broadcastId}`,
      data
    );
    return response.data;
  },

  delete: async (botId: string, broadcastId: string) => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/bots/${botId}/broadcasts/${broadcastId}`
    );
    return response.data;
  },

  send: async (botId: string, broadcastId: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string; totalTargets: number }>>(
      `/bots/${botId}/broadcasts/${broadcastId}/send`
    );
    return response.data;
  },

  schedule: async (botId: string, broadcastId: string, scheduledAt: string) => {
    const response = await apiClient.post<ApiResponse<Broadcast>>(
      `/bots/${botId}/broadcasts/${broadcastId}/schedule`,
      { scheduledAt }
    );
    return response.data;
  },
};
