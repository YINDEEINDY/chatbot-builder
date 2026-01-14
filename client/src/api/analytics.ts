import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface AnalyticsSummary {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  uniqueUsers: number;
  percentChange: {
    messages: number;
    users: number;
  };
}

export interface DailyData {
  date: string;
  incoming: number;
  outgoing: number;
  users: number;
}

export interface ContactStats {
  totalContacts: number;
  activeToday: number;
  activeLast7Days: number;
}

export const analyticsApi = {
  getSummary: async (botId: string, days = 7) => {
    const response = await apiClient.get<ApiResponse<AnalyticsSummary>>(
      `/bots/${botId}/analytics/summary?days=${days}`
    );
    return response.data;
  },

  getDailyData: async (botId: string, days = 7) => {
    const response = await apiClient.get<ApiResponse<DailyData[]>>(
      `/bots/${botId}/analytics/daily?days=${days}`
    );
    return response.data;
  },

  getContactStats: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<ContactStats>>(
      `/bots/${botId}/analytics/contacts`
    );
    return response.data;
  },
};
