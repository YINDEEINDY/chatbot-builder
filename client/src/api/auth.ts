import { apiClient } from './client';
import type { ApiResponse, User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: async (data: { email: string; password: string; name: string }) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string; rememberMe?: boolean }) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  // Facebook OAuth
  getFacebookAuthUrl: async () => {
    const response = await apiClient.get<ApiResponse<{ url: string }>>('/auth/facebook');
    return response.data;
  },

  loginWithFacebookToken: async (accessToken: string) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/facebook/token', {
      accessToken,
    });
    return response.data;
  },

  // Facebook Pages OAuth (Connect Page to Bot)
  getFacebookPagesAuthUrl: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<{ url: string }>>(
      `/auth/facebook/pages?botId=${botId}`
    );
    return response.data;
  },

  getFacebookPagesFromSession: async (sessionId: string) => {
    const response = await apiClient.get<
      ApiResponse<{
        botId: string;
        pages: Array<{ id: string; name: string; picture?: string }>;
      }>
    >(`/auth/facebook/pages/session/${sessionId}`);
    return response.data;
  },

  connectFacebookPage: async (botId: string, sessionId: string, pageId: string) => {
    const response = await apiClient.post<
      ApiResponse<{
        id: string;
        name: string;
        facebookPageId: string;
        facebookPageName: string;
        isActive: boolean;
      }>
    >(`/auth/facebook/pages/${botId}/connect`, { sessionId, pageId });
    return response.data;
  },

  disconnectFacebookPage: async (botId: string) => {
    const response = await apiClient.delete<
      ApiResponse<{
        id: string;
        name: string;
        facebookPageId: null;
        facebookPageName: null;
        isActive: boolean;
      }>
    >(`/auth/facebook/pages/${botId}/disconnect`);
    return response.data;
  },
};
