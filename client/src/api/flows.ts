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
    data: { name?: string; nodes?: FlowNode[]; edges?: FlowEdge[]; triggers?: string[]; isActive?: boolean }
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

  duplicate: async (botId: string, flowId: string) => {
    const response = await apiClient.post<ApiResponse<Flow>>(
      `/bots/${botId}/flows/${flowId}/duplicate`
    );
    return response.data;
  },

  templates: async (botId: string) =>
    (await apiClient.get<ApiResponse<FlowTemplateInfo[]>>(`/bots/${botId}/flows/templates/list`)).data.data ?? [],

  fromTemplate: async (botId: string, key: string) =>
    (await apiClient.post<ApiResponse<Flow>>(`/bots/${botId}/flows/templates/${key}`)).data.data!,

  simulate: async (botId: string, flowId: string, body: { nodes: FlowNode[]; edges: FlowEdge[]; state?: SimState; text?: string; payload?: string }) => {
    const response = await apiClient.post<ApiResponse<SimResult>>(`/bots/${botId}/flows/${flowId}/simulate`, body);
    return response.data.data!;
  },
};

export interface SimState { nodeId: string | null; vars: Record<string, string>; retries: number }
export interface SimResult {
  out: { text: string; imageUrl?: string; buttons?: { id: string; label: string; payload: string }[] }[];
  state: SimState;
  saved: Record<string, string>;
  handoff: boolean;
}

export interface FlowTemplateInfo { key: string; name: string; description: string; collects: string[]; questions: number }
