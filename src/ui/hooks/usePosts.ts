import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { postsApi, profilesApi } from '@/lib/api/api';
import { useAuthStore } from '@/stores/authStore';
import type { Post, Comment } from '@/lib/api/types';

// Frontend Post type with Date timestamp
export interface FrontendPost extends Omit<Post, 'timestamp'> {
  timestamp: Date;
}

export interface FrontendComment extends Omit<Comment, 'timestamp'> {
  timestamp: Date;
  isLiked?: boolean; // Comments are now posts, so they can be liked
  likes?: number; // Like count for comments
}

// Convert Post (already normalized from API) to FrontendPost format (with Date timestamp)
function convertPost(post: Post): FrontendPost {
  // Post is already normalized from API (snake_case -> camelCase), just convert timestamp to Date
  const result: FrontendPost = {
    id: post.id,
    author: post.author, // Already has avatar field from normalization
    content: post.content || post.text || '',
    timestamp: new Date(post.timestamp),
    likes: post.likes,
    isLiked: post.isLiked,
    shares: post.shares || 0,
    comments: post.comments || 0,
    community: post.community,
    isGlobal: post.isGlobal,
    audioFile: post.audio_url ? {
      url: post.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
  };
  return result;
}

// Comments are now posts with parent_post_id, so we can use convertPost
// This function is kept for backward compatibility but converts FrontendPost to FrontendComment format
function convertComment(post: FrontendPost): FrontendComment {
  const result: FrontendComment = {
    id: post.id,
    postId: post.id, // For comments, postId is the parent post ID (handled by backend)
    author: post.author,
    content: post.content || post.text || '',
    timestamp: post.timestamp, // FrontendPost already has Date timestamp
    audioFile: post.audioFile,
    // Include like data from post
    isLiked: post.isLiked,
    likes: post.likes,
  } as FrontendComment;
  return result;
}

export const usePosts = () => {
  const { isGuest } = useAuthStore();
  
  const query = useInfiniteQuery<FrontendPost[], Error>({
    queryKey: ['posts', 'feed'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await postsApi.getFeed({ limit: 20, offset: pageParam as number });
      return response.data.map(convertPost);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // Check if we should load more
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
  });
  
  // Transform the data after fetching
  const allPosts = query.data?.pages.flat() || [];
  
  // For now, since backend doesn't return community/isGlobal fields,
  // show all posts (they're all treated as global posts)
  // TODO: Update this logic when backend returns community/isGlobal fields
  return {
    ...query,
    data: allPosts,
  };
};

export const useCommunityPosts = (communityId: string) => {
  // Community posts are still mock, but structure is ready for API
  return useQuery<Post[]>({
    queryKey: ['posts', 'community', communityId],
    queryFn: async () => {
      // TODO: When communities API is ready, use: postsApi.getFeed({ communityId })
      // For now, return empty array
      return [];
    },
    enabled: !!communityId,
  });
};

export const useGlobalPosts = () => {
  const query = useInfiniteQuery<FrontendPost[], Error>({
    queryKey: ['posts', 'global'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await postsApi.getFeed({ limit: 20, offset: pageParam as number });
      return response.data.filter(post => post.isGlobal === true).map(convertPost);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const usePost = (postId: string) => {
  return useQuery<FrontendPost | null>({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const post = await postsApi.getPost(postId);
      return convertPost(post);
    },
    enabled: !!postId,
  });
};

export const useComments = (postId: string) => {
  const query = useInfiniteQuery<FrontendComment[], Error>({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam = 0 }) => {
      // Comments are now posts with parent_post_id, fetch them as posts
      const response = await postsApi.getComments(postId, { limit: 20, offset: pageParam as number });
      // Convert posts to FrontendComment format for backward compatibility
      return response.data.map(convertPost).map(convertComment);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
    enabled: !!postId,
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation<FrontendComment, Error, { postId: string; content: string; audioFile?: File }>({
    mutationFn: async ({ postId, content }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Audio upload is not implemented yet - don't send audio_url
      // Comments are now posts with parent_post_id
      const commentPost = await postsApi.createComment(postId, {
        content: content || undefined,
        audio_url: null, // Audio upload will be implemented later
      });
      
      // Convert the post to FrontendPost, then to FrontendComment format
      const frontendPost = convertPost(commentPost);
      return convertComment(frontendPost);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this post
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      // Invalidate the post to update comment count
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation<FrontendPost, Error, { content: string; audioFile?: File | null }>({
    mutationFn: async ({ content }) => {
      // Audio upload is not implemented yet - don't send audio_url
      const post = await postsApi.createPost({
        text: content || undefined,
        audio_url: null, // Audio upload will be implemented later
      });
      
      return convertPost(post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => postsApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
    },
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => postsApi.toggleLike(postId),
    onMutate: async (postId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      // Snapshot previous values for rollback
      const previousQueries: Record<string, unknown> = {};
      
      // Get all post-related queries and snapshot them
      queryClient.getQueryCache().findAll({ queryKey: ['posts'] }).forEach(query => {
        previousQueries[query.queryKey.join('.')] = query.state.data;
      });

      // Optimistically update all infinite post queries (feed, user posts, community posts)
      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (old: any) => {
          if (!old || !old.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: FrontendPost[]) =>
              page.map((post: FrontendPost) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1,
                  };
                }
                return post;
              })
            ),
          };
        }
      );

      // Update the specific post detail if it exists
      queryClient.setQueryData<FrontendPost>(['post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          likes: old.isLiked ? old.likes - 1 : old.likes + 1,
        };
      });

      // Optimistically update comments cache (comments are now posts)
      queryClient.setQueriesData(
        { queryKey: ['comments'] },
        (old: any) => {
          if (!old || !old.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: FrontendComment[]) =>
              page.map((comment: FrontendComment) => {
                if (comment.id === postId) {
                  return {
                    ...comment,
                    isLiked: !comment.isLiked,
                    likes: (comment.isLiked ? (comment.likes || 0) - 1 : (comment.likes || 0) + 1),
                  };
                }
                return comment;
              })
            ),
          };
        }
      );

      return { previousQueries };
    },
    onSuccess: (updatedPost, postId) => {
      // Use the server response to update the cache with the exact state
      // This ensures we have the correct like count and state from the server
      const normalizedPost = convertPost(updatedPost);
      
      // Update all infinite post queries with the server response
      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (old: any) => {
          if (!old || !old.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: FrontendPost[]) =>
              page.map((post: FrontendPost) => {
                if (post.id === postId) {
                  return normalizedPost;
                }
                return post;
              })
            ),
          };
        }
      );

      // Update comments cache if this is a comment (post with parent_post_id)
      // Comments are stored in ['comments', parentPostId] queries
      queryClient.setQueriesData(
        { queryKey: ['comments'] },
        (old: any) => {
          if (!old || !old.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: FrontendComment[]) =>
              page.map((comment: FrontendComment) => {
                if (comment.id === postId) {
                  // Update comment with like data from the post
                  return {
                    ...comment,
                    isLiked: normalizedPost.isLiked,
                    likes: normalizedPost.likes,
                  };
                }
                return comment;
              })
            ),
          };
        }
      );

      // Update the specific post detail with the server response
      queryClient.setQueryData<FrontendPost>(['post', postId], normalizedPost);
    },
    onError: (_err, _postId, context) => {
      // Rollback all queries on error
      if (context?.previousQueries) {
        Object.entries(context.previousQueries).forEach(([key, data]) => {
          const queryKey = key.split('.');
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
};

export const useUserPosts = (username: string) => {
  const query = useInfiniteQuery<FrontendPost[], Error>({
    queryKey: ['posts', 'user', username],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await profilesApi.getUserPosts(username, { limit: 20, offset: pageParam as number });
      return response.data.map(convertPost);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
    enabled: !!username,
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};
