import { AppError } from '../middlewares/errorHandler.js';

interface GraphApiPaging {
  cursors?: { after?: string; before?: string };
  next?: string;
}

export interface PagePost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  from?: { id: string; name: string };
  type?: string;
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
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

interface GraphApiResponse<T> {
  data: T[];
  paging?: GraphApiPaging;
  error?: { message: string; type: string; code: number };
}

export interface PagePostsResponse {
  posts: PagePost[];
  paging: { after?: string; hasNext: boolean };
}

export interface PostCommentsResponse {
  comments: PostComment[];
  paging: { after?: string; hasNext: boolean };
}

export class PageContentService {
  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

  async getPagePosts(
    pageAccessToken: string,
    pageId: string,
    limit = 25,
    after?: string
  ): Promise<PagePostsResponse> {
    const params = new URLSearchParams({
      fields: 'id,message,story,created_time,full_picture,permalink_url,from,type,likes.summary(true),comments.summary(true)',
      limit: String(limit),
      access_token: pageAccessToken,
    });

    if (after) {
      params.set('after', after);
    }

    const url = `${this.graphApiUrl}/${pageId}/feed?${params.toString()}`;
    const data = await this.callGraphApi<PagePost>(url);

    return {
      posts: data.data,
      paging: {
        after: data.paging?.cursors?.after,
        hasNext: !!data.paging?.next,
      },
    };
  }

  async getPostComments(
    pageAccessToken: string,
    postId: string,
    limit = 25,
    after?: string
  ): Promise<PostCommentsResponse> {
    const params = new URLSearchParams({
      fields: 'id,message,created_time,from,like_count,comment_count,attachment',
      limit: String(limit),
      access_token: pageAccessToken,
    });

    if (after) {
      params.set('after', after);
    }

    const url = `${this.graphApiUrl}/${postId}/comments?${params.toString()}`;
    const data = await this.callGraphApi<PostComment>(url);

    return {
      comments: data.data,
      paging: {
        after: data.paging?.cursors?.after,
        hasNext: !!data.paging?.next,
      },
    };
  }

  async deleteComment(
    pageAccessToken: string,
    commentId: string
  ): Promise<{ success: boolean }> {
    const url = `${this.graphApiUrl}/${commentId}?access_token=${pageAccessToken}`;

    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json() as { success?: boolean; error?: { message: string } };

    if (data.error) {
      throw new AppError(`Facebook API Error: ${data.error.message}`, 502);
    }

    return { success: true };
  }

  private async callGraphApi<T>(url: string): Promise<GraphApiResponse<T>> {
    const response = await fetch(url);
    const data = await response.json() as GraphApiResponse<T>;

    if (data.error) {
      console.error('Facebook Graph API Error:', JSON.stringify(data.error, null, 2));
      throw new AppError(`Facebook API Error: ${data.error.message}`, 502);
    }

    return data;
  }
}

export const pageContentService = new PageContentService();
