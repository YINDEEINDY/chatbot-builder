import { apiClient } from './client';
import type { ApiResponse, Block, BlockCard } from '../types';

interface CreateBlockData {
  name: string;
  groupName?: string | null;
  isWelcome?: boolean;
  isDefaultAnswer?: boolean;
  isEnabled?: boolean;
  cards?: BlockCard[];
  triggers?: string[];
}

interface UpdateBlockData {
  name?: string;
  groupName?: string | null;
  isWelcome?: boolean;
  isDefaultAnswer?: boolean;
  isEnabled?: boolean;
  cards?: BlockCard[];
  triggers?: string[];
}

export const blocksApi = {
  list: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<Block[]>>(`/bots/${botId}/blocks`);
    return response.data;
  },

  get: async (botId: string, blockId: string) => {
    const response = await apiClient.get<ApiResponse<Block>>(`/bots/${botId}/blocks/${blockId}`);
    return response.data;
  },

  getGroups: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<string[]>>(`/bots/${botId}/blocks/groups`);
    return response.data;
  },

  create: async (botId: string, data: CreateBlockData) => {
    const response = await apiClient.post<ApiResponse<Block>>(`/bots/${botId}/blocks`, data);
    return response.data;
  },

  update: async (botId: string, blockId: string, data: UpdateBlockData) => {
    const response = await apiClient.put<ApiResponse<Block>>(
      `/bots/${botId}/blocks/${blockId}`,
      data
    );
    return response.data;
  },

  delete: async (botId: string, blockId: string) => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/bots/${botId}/blocks/${blockId}`
    );
    return response.data;
  },

  duplicate: async (botId: string, blockId: string) => {
    const response = await apiClient.post<ApiResponse<Block>>(
      `/bots/${botId}/blocks/${blockId}/duplicate`
    );
    return response.data;
  },
};
