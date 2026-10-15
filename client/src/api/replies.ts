import { apiClient } from './client';
import type { ApiResponse, AutoReplyRule, CannedResponse } from '../types';

const crud = <T extends { id: string }>(path: string) => ({
  list: async (botId: string) => (await apiClient.get<ApiResponse<T[]>>(`/bots/${botId}/${path}`)).data.data ?? [],
  create: async (botId: string, data: Omit<T, 'id'>) => (await apiClient.post<ApiResponse<T>>(`/bots/${botId}/${path}`, data)).data.data!,
  update: async (botId: string, id: string, data: Omit<T, 'id'>) => (await apiClient.put<ApiResponse<T>>(`/bots/${botId}/${path}/${id}`, data)).data.data!,
  remove: async (botId: string, id: string) => { await apiClient.delete(`/bots/${botId}/${path}/${id}`); },
});

export const cannedApi = crud<CannedResponse>('canned-responses');
export const rulesApi = crud<AutoReplyRule>('rules');

/** Pull the server's message out of an axios error, in Thai-friendly form. */
export function errorText(e: unknown, fallback = 'ทำรายการไม่สำเร็จ ลองอีกครั้ง') {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg || fallback;
}
