import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent } from '../components/ui/Card';
import { useBotStore } from '../stores/bot.store';
import { pageContentApi, PagePost, PostComment } from '../api/pageContent';
import {
  FileText,
  RefreshCw,
  ThumbsUp,
  MessageCircle,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  AlertTriangle,
  UserCircle,
} from 'lucide-react';

export function PagePostsPage() {
  const { currentBot } = useBotStore();

  const [posts, setPosts] = useState<PagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postsAfter, setPostsAfter] = useState<string | undefined>();
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [commentsPaging, setCommentsPaging] = useState<Record<string, { after?: string; hasNext: boolean }>>({});
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  const loadPosts = useCallback(async (append = false) => {
    if (!currentBot?.id) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await pageContentApi.getPosts(
        currentBot.id,
        25,
        append ? postsAfter : undefined
      );

      if (res.success && res.data) {
        if (append) {
          setPosts((prev) => [...prev, ...res.data!.posts]);
        } else {
          setPosts(res.data.posts);
        }
        setPostsAfter(res.data.paging.after);
        setHasMorePosts(res.data.paging.hasNext);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentBot?.id, postsAfter]);

  useEffect(() => {
    if (currentBot?.id) {
      loadPosts();
    }
  }, [currentBot?.id]);

  const loadComments = async (postId: string, append = false) => {
    if (!currentBot?.id) return;

    setCommentsLoading(postId);

    try {
      const afterCursor = append ? commentsPaging[postId]?.after : undefined;
      const res = await pageContentApi.getComments(currentBot.id, postId, 25, afterCursor);

      if (res.success && res.data) {
        if (append) {
          setComments((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), ...res.data!.comments],
          }));
        } else {
          setComments((prev) => ({ ...prev, [postId]: res.data!.comments }));
        }
        setCommentsPaging((prev) => ({ ...prev, [postId]: res.data!.paging }));
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(null);
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!currentBot?.id) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setDeletingComment(commentId);

    try {
      const res = await pageContentApi.deleteComment(currentBot.id, commentId);
      if (res.success) {
        setComments((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
        }));
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId && p.comments?.summary) {
              return {
                ...p,
                comments: {
                  summary: { total_count: p.comments.summary.total_count - 1 },
                },
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment. You may not have permission.');
    } finally {
      setDeletingComment(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPageNotConnected = !currentBot?.facebookPageId;

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Page Posts</h1>
            <p className="text-gray-500 mt-1">
              View posts and comments on your Facebook Page
            </p>
          </div>
          <button
            onClick={() => loadPosts()}
            disabled={loading || isPageNotConnected}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Not Connected Warning */}
        {isPageNotConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Facebook Page Not Connected
            </h3>
            <p className="text-yellow-600 mb-4">
              Connect a Facebook Page in the Configure page to view posts and comments.
            </p>
            <a
              href={`/bots/${currentBot?.id}/settings`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Go to Configure
            </a>
          </div>
        )}

        {/* Loading State */}
        {loading && !isPageNotConnected && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-500">Loading posts...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Posts</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => loadPosts()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !isPageNotConnected && posts.length === 0 && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No Posts Yet</h3>
            <p className="text-gray-400">
              Posts from your Facebook Page will appear here.
            </p>
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-5">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {post.from?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(post.created_time)}</p>
                      </div>
                    </div>
                    {post.permalink_url && (
                      <a
                        href={post.permalink_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Post Content */}
                  {(post.message || post.story) && (
                    <p className="text-gray-800 mb-3 whitespace-pre-wrap">
                      {post.message || post.story}
                    </p>
                  )}

                  {/* Post Image */}
                  {post.full_picture && (
                    <div className="mb-3 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={post.full_picture}
                        alt="Post"
                        className="w-full max-h-96 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-6 py-2 border-t border-b border-gray-100 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4" />
                      {post.likes?.summary?.total_count || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments?.summary?.total_count || 0}
                    </span>
                    {post.shares && (
                      <span className="flex items-center gap-1.5">
                        <Share2 className="w-4 h-4" />
                        {post.shares.count || 0}
                      </span>
                    )}
                  </div>

                  {/* Toggle Comments Button */}
                  {(post.comments?.summary?.total_count || 0) > 0 && (
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {expandedPostId === post.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Comments
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          View {post.comments?.summary?.total_count || 0} Comment
                          {(post.comments?.summary?.total_count || 0) !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}

                  {/* Comments Section */}
                  {expandedPostId === post.id && (
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-100">
                      {/* Comments Loading */}
                      {commentsLoading === post.id && !comments[post.id] && (
                        <div className="flex items-center gap-2 py-3 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading comments...
                        </div>
                      )}

                      {/* Comment Items */}
                      {(comments[post.id] || []).map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-gray-50 rounded-lg p-3 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {comment.from?.name || 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDate(comment.created_time)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {comment.message}
                              </p>
                              {comment.attachment?.media?.image?.src && (
                                <img
                                  src={comment.attachment.media.image.src}
                                  alt="Comment attachment"
                                  className="mt-2 max-h-40 rounded"
                                  loading="lazy"
                                />
                              )}
                              {comment.like_count != null && comment.like_count > 0 && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-gray-400">
                                  <ThumbsUp className="w-3 h-3" />
                                  {comment.like_count}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteComment(post.id, comment.id)}
                              disabled={deletingComment === comment.id}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                              title="Delete comment"
                            >
                              {deletingComment === comment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Load More Comments */}
                      {commentsPaging[post.id]?.hasNext && (
                        <button
                          onClick={() => loadComments(post.id, true)}
                          disabled={commentsLoading === post.id}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          {commentsLoading === post.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          Load more comments
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Load More Posts */}
            {hasMorePosts && (
              <div className="text-center py-4">
                <button
                  onClick={() => loadPosts(true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Load More Posts
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
