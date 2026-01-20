import { useQuery, useMutation, useConvex } from "convex/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from '@/stores/authStore';
import type { Post, Comment } from '@/lib/api/types';

// UI-friendly Post type adapted from Convex Post
export interface FrontendPost {
  id: string;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  text?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
  likes: number;
  isLiked?: boolean;
  shares?: number;
  comments?: number;
  community?: string;
  isGlobal?: boolean;
}

// UI-friendly Comment type adapted from Convex Comment
export interface FrontendComment {
  id: string;
  postId: string;
  parentId?: string | null;
  path?: string;
  depth?: number;
  author: {
    username: string;
    avatar?: string;
  };
  content?: string;
  audio_url?: string | null;
  audioFile?: {
    url: string;
    title: string;
    duration: number;
  };
  timestamp: Date;
  isLiked?: boolean;
  likes?: number;
  repliesCount?: number;
}

// Convert Convex Post to UI-friendly FrontendPost format
function convertPost(post: Post): FrontendPost {
  return {
    id: post.id,
    author: {
      username: post.author?.username || 'unknown',
      avatar: post.author?.avatar_url || undefined,
    },
    content: post.text || '',
    text: post.text,
    audio_url: post.audio_url || null,
    audioFile: post.audio_url ? {
      url: post.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
    timestamp: new Date(post.created_at),
    likes: post.likes_count || 0,
    isLiked: post.is_liked || false,
    shares: 0,
    comments: post.comments_count || 0,
    community: undefined,
    isGlobal: true,
  };
}

// Convert Convex Comment to UI-friendly FrontendComment format
function convertComment(comment: Comment): FrontendComment {
  return {
    id: comment.id,
    postId: String((comment as any).post_id || comment.id), // Comment from posts.getComments has post_id
    parentId: comment.parent_id ?? null,
    path: comment.path,
    depth: comment.depth ?? 0,
    author: {
      username: comment.author?.username || 'unknown',
      avatar: comment.author?.avatar_url || undefined,
    },
    content: comment.text || '',
    audio_url: comment.audio_url || null,
    audioFile: comment.audio_url ? {
      url: comment.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
    timestamp: new Date(comment.created_at),
    isLiked: comment.is_liked || false,
    likes: comment.likes_count || 0,
    repliesCount: (comment as any).replies_count || 0, // May not be present in all comment types
  };
}

/**
 * Get posts feed with cursor-based pagination
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const usePosts = () => {
  const convex = useConvex();

  const query = useInfiniteQuery({
    queryKey: ['posts', 'feed'],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.posts.getFeed, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as Id<"posts"> | null,
  });

  // Flatten all pages into a single array
  const allPosts = query.data?.pages.flatMap(page =>
    page.data.map(convertPost)
  ) ?? [];

  return {
    data: allPosts,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
};

export const useCommunityPosts = (_communityId: string) => {
  // Community posts are not implemented in Convex backend yet
  return {
    data: [] as FrontendPost[],
    isLoading: false,
    error: null,
    refetch: () => {},
  };
};

/**
 * Get global posts feed
 */
export const useGlobalPosts = () => {
  const result = useQuery(api.posts.getFeed, { limit: 20 });
  
  const posts = result?.data?.map(convertPost).filter((post: FrontendPost) => post.isGlobal === true) || [];
  const isLoading = result === undefined;
  
  return {
    data: posts,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    refetch: () => {},
  };
};

/**
 * Get a single post
 */
export const usePost = (postId: string) => {
  const result = useQuery(
    api.posts.getById, 
    postId ? { postId: postId as Id<"posts"> } : "skip"
  );
  
  return {
    data: result ? convertPost(result) : null,
    isLoading: result === undefined && !!postId,
    error: null,
    refetch: () => {},
  };
};

/**
 * Get comments for a post with cursor-based pagination
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const useComments = (postId: string) => {
  const convex = useConvex();

  const query = useInfiniteQuery({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.comments.getByPost, {
        postId: postId as Id<"posts">,
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!postId,
  });

  // Flatten all pages into a single array
  const allComments = query.data?.pages.flatMap(page =>
    page.data.map(convertComment)
  ) ?? [];

  return {
    data: allComments,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
};

export const useCreateComment = () => {
  const createComment = useMutation(api.comments.create);
  const { user } = useAuthStore();
  
  return {
    mutate: (
      variables: { postId: string; content: string; audioFile?: File },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      if (!user) {
        options?.onError?.(new Error('User not authenticated'));
        return;
      }
      
      createComment({
        postId: variables.postId as Id<"posts">,
        text: variables.content || undefined,
      })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (variables: { postId: string; content: string; audioFile?: File }) => {
      if (!user) throw new Error('User not authenticated');
      
      const result = await createComment({
        postId: variables.postId as Id<"posts">,
        text: variables.content || undefined,
      });

      return convertComment(result);
    },
    isPending: false,
  };
};

export const useCreatePost = () => {
  const createPost = useMutation(api.posts.create);
  
  return {
    mutate: (
      variables: { content: string; audioFile?: File | null },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      createPost({ text: variables.content || undefined })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (variables: { content: string; audioFile?: File | null }) => {
      const result = await createPost({ text: variables.content || undefined });
      return convertPost(result);
    },
    isPending: false,
  };
};

export const useDeletePost = () => {
  const deletePost = useMutation(api.posts.remove);
  
  return {
    mutate: (postId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      deletePost({ postId: postId as Id<"posts"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (postId: string) => {
      await deletePost({ postId: postId as Id<"posts"> });
    },
    isPending: false,
  };
};

export const useToggleLike = () => {
  const toggleLike = useMutation(api.posts.toggleLike);
  
  return {
    mutate: (postId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      toggleLike({ postId: postId as Id<"posts"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (postId: string) => {
      const result = await toggleLike({ postId: postId as Id<"posts"> });
      return convertPost(result);
    },
    isPending: false,
  };
};

/**
 * Hook to toggle like on a comment
 * Uses the comments.toggleLike mutation (separate from post likes)
 */
export const useToggleCommentLike = () => {
  const toggleLike = useMutation(api.comments.toggleLike);
  
  return {
    mutate: (commentId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      toggleLike({ commentId: commentId as Id<"comments"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (commentId: string) => {
      const result = await toggleLike({ commentId: commentId as Id<"comments"> });
      // Convert the comment result to FrontendComment format
      return convertComment(result);
    },
    isPending: false,
  };
};

/**
 * Get posts by username with cursor-based pagination
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const useUserPosts = (username: string) => {
  const convex = useConvex();

  const query = useInfiniteQuery({
    queryKey: ['posts', 'user', username],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.posts.getByUsername, {
        username,
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as Id<"posts"> | null,
    enabled: !!username,
  });

  // Flatten all pages into a single array
  const allPosts = query.data?.pages.flatMap(page =>
    page.data.map(convertPost)
  ) ?? [];

  return {
    data: allPosts,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
};
