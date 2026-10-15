import { apiClient } from './client';
import type { BotSettings, ApiResponse, Bot } from '../types';

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

  update: async (id: string, data: BotSettings) => {
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

  channelStatus: async (id: string) =>
    (await apiClient.get<ApiResponse<ChannelStatus>>(`/bots/${id}/channel-status`)).data.data!,

  connectLine: async (id: string, secret: string, token: string) =>
    (await apiClient.post<ApiResponse<LineConnectResult>>(`/bots/${id}/line/connect`, { secret, token })).data.data!,
};

export interface SetupStep { ok: boolean | null; text: string }
export interface LineConnectResult { ok: boolean; steps: SetupStep[]; info?: { displayName: string; basicId: string; pictureUrl?: string } }
export interface ChannelStatus {
  line: { connected: boolean; name?: string; basicId?: string; pictureUrl?: string; addFriendUrl?: string; webhookUrl: string; webhookMatches?: boolean; webhookActive?: boolean; error?: string };
  facebook: { connected: boolean; pageName?: string | null; pageId?: string | null; messengerUrl?: string; subscribed?: boolean; webhookUrl: string; verifyTokenSet: boolean; error?: string };
  instagram: { connected: boolean; username?: string | null; dmUrl?: string };
  web: { scriptUrl: string; demoUrl: string };
  publicUrlOk: boolean;
}
