import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
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
 * Get posts feed with cursor-based pagination
 * Supports infinite scroll by accumulating posts across pages
 */
export const usePosts = () => {
  const [cursor, setCursor] = useState<Id<"posts"> | null | undefined>(null);
  const [allPosts, setAllPosts] = useState<FrontendPost[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Query with current cursor
  const result = useQuery(
    api.posts.getFeed,
    cursor === null ? { limit: 20 } : cursor ? { limit: 20, cursor } : "skip"
  );
  
  // Reset posts when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data) {
      setAllPosts(result.data.map(convertPost));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data]);
  
  // Append new posts when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data) {
      setAllPosts(prev => {
        // Avoid duplicates by checking if post ID already exists
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = result.data
          .map(convertPost)
          .filter(post => !existingIds.has(post.id));
        return [...prev, ...newPosts];
      });
    }
  }, [cursor, result?.data]);
  
  const fetchNextPage = () => {
    // Only fetch if there's more data and we have a cursor
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllPosts([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allPosts,
    isLoading: isInitialLoad && result === undefined,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
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
 * Supports infinite scroll
 */
export const useComments = (postId: string) => {
  const [cursor, setCursor] = useState<string | null | undefined>(null);
  const [allComments, setAllComments] = useState<FrontendComment[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Query with current cursor
  const result = useQuery(
    api.posts.getComments,
    postId && cursor === null 
      ? { postId: postId as Id<"posts">, limit: 20 } 
      : postId && cursor 
        ? { postId: postId as Id<"posts">, limit: 20, cursor } 
        : "skip"
  );
  
  // Reset comments when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data && postId) {
      setAllComments(result.data.map(convertComment));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, postId]);
  
  // Append new comments when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && postId) {
      setAllComments(prev => {
        // Avoid duplicates by checking if comment ID already exists
        const existingIds = new Set(prev.map(c => c.id));
        const newComments = result.data
          .map(convertComment)
          .filter(comment => !existingIds.has(comment.id));
        return [...prev, ...newComments];
      });
    }
  }, [cursor, result?.data, postId]);
  
  // Reset when postId changes
  useEffect(() => {
    setCursor(null);
    setAllComments([]);
    setIsInitialLoad(true);
  }, [postId]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllComments([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allComments,
    isLoading: isInitialLoad && result === undefined && !!postId,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
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
 * Get posts by username with cursor-based pagination
 * Supports infinite scroll
 */
export const useUserPosts = (username: string) => {
  const [cursor, setCursor] = useState<Id<"posts"> | null | undefined>(null);
  const [allPosts, setAllPosts] = useState<FrontendPost[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset when username changes
  useEffect(() => {
    setCursor(null);
    setAllPosts([]);
    setIsInitialLoad(true);
  }, [username]);
  
  // Query with current cursor
  const result = useQuery(
    api.posts.getByUsername,
    username && cursor === null
      ? { username, limit: 20 }
      : username && cursor
        ? { username, limit: 20, cursor }
        : "skip"
  );
  
  // Reset posts when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data && username) {
      setAllPosts(result.data.map(convertPost));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, username]);
  
  // Append new posts when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && username) {
      setAllPosts(prev => {
        // Avoid duplicates by checking if post ID already exists
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = result.data
          .map(convertPost)
          .filter(post => !existingIds.has(post.id));
        return [...prev, ...newPosts];
      });
    }
  }, [cursor, result?.data, username]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllPosts([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allPosts,
    isLoading: isInitialLoad && result === undefined && !!username,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
  };
};
