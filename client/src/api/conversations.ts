import { apiClient } from './client';
import type { ApiResponse, Contact, Conversation, ConversationStatus, Message } from '../types';

export type Assignee = 'mine' | 'unassigned' | 'all';
export interface ConversationList {
  conversations: Conversation[];
  counts: Partial<Record<ConversationStatus, number>>;
}

const base = (botId: string) => `/bots/${botId}/conversations`;

export const conversationsApi = {
  list: async (botId: string, opts: { status?: ConversationStatus | 'all'; assignee?: Assignee; search?: string } = {}) => {
    const params = new URLSearchParams(Object.entries(opts).filter(([, v]) => v) as [string, string][]);
    return (await apiClient.get<ApiResponse<ConversationList>>(`${base(botId)}?${params}`)).data;
  },
  getMessages: async (botId: string, conversationId: string) =>
    (await apiClient.get<ApiResponse<{ messages: Message[] }>>(`${base(botId)}/${conversationId}/messages?limit=200`)).data,
  takeover: async (botId: string, conversationId: string) =>
    (await apiClient.put<ApiResponse<Conversation>>(`${base(botId)}/${conversationId}/takeover`)).data,
  release: async (botId: string, conversationId: string) =>
    (await apiClient.put<ApiResponse<Conversation>>(`${base(botId)}/${conversationId}/release`)).data,
  close: async (botId: string, conversationId: string) =>
    (await apiClient.put<ApiResponse<Conversation>>(`${base(botId)}/${conversationId}/close`)).data,
  sendMessage: async (botId: string, conversationId: string, content: string) =>
    (await apiClient.post<ApiResponse<Message>>(`${base(botId)}/${conversationId}/messages`, { content })).data,
  saveProfile: async (botId: string, contactId: string, data: { tags?: string[]; notes?: string | null }) =>
    (await apiClient.put<ApiResponse<Contact>>(`/bots/${botId}/contacts/${contactId}/profile`, data)).data,
  saveAttributes: async (botId: string, contactId: string, attributes: Record<string, string>) =>
    (await apiClient.put<ApiResponse<Contact>>(`/bots/${botId}/contacts/${contactId}/attributes`, attributes)).data,
};
