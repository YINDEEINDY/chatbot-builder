import { apiClient } from './client';
import type { ApiResponse, User } from '../types';

interface UpdateProfileData {
  name?: string;
  profilePic?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const profileApi = {
  updateProfile: async (data: UpdateProfileData) => {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/profile/change-password', data);
    return response.data;
  },
};
