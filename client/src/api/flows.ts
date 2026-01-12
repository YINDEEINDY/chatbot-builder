import { apiClient } from './client';
import type { ApiResponse, Flow, FlowNode, FlowEdge } from '../types';

export const flowsApi = {
  list: async (botId: string) => {
    const response = await apiClient.get<ApiResponse<Flow[]>>(`/bots/${botId}/flows`);
    return response.data;
  },

  get: async (botId: string, flowId: string) => {
    const response = await apiClient.get<ApiResponse<Flow>>(`/bots/${botId}/flows/${flowId}`);
    return response.data;
  },

  create: async (botId: string, data: { name: string }) => {
    const response = await apiClient.post<ApiResponse<Flow>>(`/bots/${botId}/flows`, data);
    return response.data;
  },

  update: async (
    botId: string,
    flowId: string,
    data: { name?: string; nodes?: FlowNode[]; edges?: FlowEdge[]; isActive?: boolean }
  ) => {
    const response = await apiClient.put<ApiResponse<Flow>>(`/bots/${botId}/flows/${flowId}`, data);
    return response.data;
  },

  delete: async (botId: string, flowId: string) => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/bots/${botId}/flows/${flowId}`
    );
    return response.data;
  },

  setDefault: async (botId: string, flowId: string) => {
    const response = await apiClient.post<ApiResponse<Flow>>(
      `/bots/${botId}/flows/${flowId}/set-default`
    );
    return response.data;
  },
};
