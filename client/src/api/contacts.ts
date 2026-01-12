import { apiClient } from './client';
import type { ApiResponse, Contact, Message, PaginatedResponse } from '../types';

interface ContactFilter {
  tags?: string;
  isSubscribed?: boolean;
  search?: string;
}

interface ContactStats {
  total: number;
  subscribed: number;
  unsubscribed: number;
  recentActive: number;
}

export const contactsApi = {
  list: async (botId: string, page = 1, limit = 20, filter?: ContactFilter) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (filter?.tags) params.append('tags', filter.tags);
    if (filter?.isSubscribed !== undefined) params.append('isSubscribed', filter.isSubscribed.toString());
    if (filter?.search) params.append('search', filter.search);

    const response = await apiClient.get<PaginatedResponse<Contact>>(`/bots/${botId}/contacts?${params}`);
    return response.data;
  },

  get: async (botId: string, contactId: string) => {
    const response = await apiClient.get<ApiResponse<Contact>>(`/bots/${botId}/contacts/${contactId}`);
    return response.data;
  },

  update: async (botId: string, contactId: string, data: { name?: string; tags?: string[]; isSubscribed?: boolean }) => {
    const response = await apiClient.put<ApiResponse<Contact>>(`/bots/${botId}/contacts/${contactId}`, data);
    return response.data;
  },

  getMessages: async (botId: string, contactId: string, page = 1, limit = 50) => {
    const response = await apiClient.get<PaginatedResponse<Message>>(
      `/bots/${botId}/contacts/${contactId}/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  addTags: async (botId: string, contactIds: string[], tags: string[]) => {
    const response = await apiClient.post<ApiResponse<{ updated: number }>>(
      `/bots/${botId}/contacts/tags/add`,
      { contactIds, tags }
    );
    return response.data;
  },

  removeTags: async (botId: string, contactIds: string[], tags: string[]) => {
    const response = await apiClient.post<ApiResponse<{ updated: number }>>(
      `/bots/${botId}/contacts/tags/remove`,
      { contactIds, tags }
    );
    return response.data;
  },

  getStats: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<ContactStats>>(`/bots/${botId}/contacts/stats`);
    return response.data;
  },
};
