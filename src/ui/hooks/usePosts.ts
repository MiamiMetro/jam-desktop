import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from '@/stores/authStore';

// Frontend Post type with Date timestamp
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

// Convert Convex post to FrontendPost format
function convertPost(post: any): FrontendPost {
  return {
    id: post.id || post._id,
    author: {
      username: post.author?.username || 'unknown',
      avatar: post.author?.avatar_url || post.author?.avatar || undefined,
    },
    content: post.text || post.content || '',
    text: post.text,
    audio_url: post.audio_url || null,
    audioFile: post.audio_url ? {
      url: post.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
    timestamp: new Date(post.created_at || post._creationTime),
    likes: post.likes_count || 0,
    isLiked: post.is_liked || false,
    shares: 0,
    comments: post.comments_count || 0,
    community: undefined,
    isGlobal: true,
  };
}

// Convert Convex comment to FrontendComment format
function convertComment(comment: any): FrontendComment {
  return {
    id: comment.id || comment._id,
    postId: comment.post_id || comment.postId || comment.id || comment._id,
    parentId: comment.parent_id ?? null,
    path: comment.path,
    depth: comment.depth ?? 0,
    author: {
      username: comment.author?.username || 'unknown',
      avatar: comment.author?.avatar_url || comment.author?.avatar || undefined,
    },
    content: comment.text || comment.content || '',
    audio_url: comment.audio_url || null,
    audioFile: comment.audio_url ? {
      url: comment.audio_url,
      title: 'Audio',
      duration: 0,
    } : undefined,
    timestamp: new Date(comment.created_at || comment._creationTime),
    isLiked: comment.is_liked || false,
    likes: comment.likes_count || 0,
    repliesCount: comment.replies_count || 0,
  };
}

/**
 * Get posts feed
 * Note: This uses useQuery (realtime) for now. Can be optimized later with
 * imperative fetch if performance becomes an issue.
 */
export const usePosts = () => {
  const result = useQuery(api.posts.getFeed, { limit: 20 });
  
  const posts = result?.data?.map(convertPost) || [];
  const isLoading = result === undefined;
  const hasMore = result?.hasMore || false;
  
  return {
    data: posts,
    isLoading,
    hasNextPage: hasMore,
    isFetchingNextPage: false,
    fetchNextPage: () => {
      // TODO: Implement cursor-based pagination
    },
    refetch: () => {
      // useQuery auto-updates, no manual refetch needed
    },
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
 * Get comments for a post
 */
export const useComments = (postId: string) => {
  const result = useQuery(
    api.posts.getComments,
    postId ? { postId: postId as Id<"posts">, limit: 20 } : "skip"
  );
  
  const comments = result?.data?.map(convertComment) || [];
  const isLoading = result === undefined && !!postId;
  
  return {
    data: comments,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    refetch: () => {},
  };
};

export const useCreateComment = () => {
  const createComment = useMutation(api.posts.createComment);
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
        content: variables.content || undefined,
      })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (variables: { postId: string; content: string; audioFile?: File }) => {
      if (!user) throw new Error('User not authenticated');
      
      const result = await createComment({
        postId: variables.postId as Id<"posts">,
        content: variables.content || undefined,
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
 * Get posts by username
 */
export const useUserPosts = (username: string) => {
  const result = useQuery(
    api.posts.getByUsername,
    username ? { username, limit: 20 } : "skip"
  );
  
  const posts = result?.data?.map(convertPost) || [];
  const isLoading = result === undefined && !!username;
  
  return {
    data: posts,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    refetch: () => {},
  };
};
