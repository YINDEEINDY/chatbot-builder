import { apiClient } from './client';
import type { ApiResponse, Conversation, Message, PaginatedResponse } from '../types';

interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const conversationsApi = {
  list: async (botId: string, status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<ApiResponse<Conversation[]>>(
      `/bots/${botId}/conversations${params}`
    );
    return response.data;
  },

  get: async (botId: string, conversationId: string) => {
    const response = await apiClient.get<ApiResponse<Conversation>>(
      `/bots/${botId}/conversations/${conversationId}`
    );
    return response.data;
  },

  getMessages: async (botId: string, conversationId: string, page = 1, limit = 50) => {
    const response = await apiClient.get<ApiResponse<MessagesResponse>>(
      `/bots/${botId}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  takeover: async (botId: string, conversationId: string) => {
    const response = await apiClient.put<ApiResponse<Conversation>>(
      `/bots/${botId}/conversations/${conversationId}/takeover`
    );
    return response.data;
  },

  release: async (botId: string, conversationId: string) => {
    const response = await apiClient.put<ApiResponse<Conversation>>(
      `/bots/${botId}/conversations/${conversationId}/release`
    );
    return response.data;
  },

  sendMessage: async (botId: string, conversationId: string, content: string) => {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/bots/${botId}/conversations/${conversationId}/messages`,
      { content }
    );
    return response.data;
  },

  close: async (botId: string, conversationId: string) => {
    const response = await apiClient.put<ApiResponse<Conversation>>(
      `/bots/${botId}/conversations/${conversationId}/close`
    );
    return response.data;
  },
};
