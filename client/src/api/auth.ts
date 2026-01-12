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

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },
};
