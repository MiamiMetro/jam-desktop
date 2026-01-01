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

// Convert backend Comment to frontend format  
function convertComment(comment: Comment): FrontendComment {
  const result: FrontendComment = {
    id: comment.id,
    postId: comment.postId,
    author: comment.author,
    content: comment.content,
    timestamp: new Date(comment.timestamp),
    audioFile: comment.audio_url ? {
      url: comment.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
  };
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
      const response = await postsApi.getComments(postId, { limit: 20, offset: pageParam as number });
      return response.data.map(convertComment);
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
      const comment = await postsApi.createComment(postId, {
        content: content || undefined,
        audio_url: null, // Audio upload will be implemented later
      });
      
      return convertComment(comment);
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

      // Update the specific post detail with the server response
      queryClient.setQueryData<FrontendPost>(['post', postId], normalizedPost);
    },
    onError: (err, postId, context) => {
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
