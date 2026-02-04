import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface PagePost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  from?: { id: string; name: string };
  type?: string;
}

export interface PostComment {
  id: string;
  message: string;
  created_time: string;
  from?: { id: string; name: string };
  like_count?: number;
  comment_count?: number;
  attachment?: {
    type: string;
    url?: string;
    media?: { image?: { src: string } };
  };
}

export interface PagePostsData {
  posts: PagePost[];
  paging: { after?: string; hasNext: boolean };
}

export interface PostCommentsData {
  comments: PostComment[];
  paging: { after?: string; hasNext: boolean };
}

export const pageContentApi = {
  getPosts: async (botId: string, limit = 25, after?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set('after', after);
    const response = await apiClient.get<ApiResponse<PagePostsData>>(
      `/bots/${botId}/page-content/posts?${params.toString()}`
    );
    return response.data;
  },

  getComments: async (botId: string, postId: string, limit = 25, after?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set('after', after);
    const response = await apiClient.get<ApiResponse<PostCommentsData>>(
      `/bots/${botId}/page-content/posts/${postId}/comments?${params.toString()}`
    );
    return response.data;
  },

  deleteComment: async (botId: string, commentId: string) => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/bots/${botId}/page-content/comments/${commentId}`
    );
    return response.data;
  },
};
