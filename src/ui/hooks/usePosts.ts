import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { useR2Upload } from "@/hooks/useR2Upload";
import type { Comment, Post } from "@/lib/api/types";

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

type FriendMutationOptions = { onSuccess?: () => void; onError?: (error: Error) => void };

function convertPost(post: Post): FrontendPost {
  return {
    id: post.id,
    author: {
      username: post.author?.username || "unknown",
      avatar: post.author?.avatar_url || undefined,
    },
    content: post.text || "",
    text: post.text,
    audio_url: post.audio_url || null,
    audioFile: post.audio_url
      ? {
          url: post.audio_url,
          title: "Audio",
          duration: 0,
        }
      : undefined,
    timestamp: new Date(post.created_at),
    likes: post.likes_count || 0,
    isLiked: post.is_liked || false,
    shares: 0,
    comments: post.comments_count || 0,
    community: undefined,
    isGlobal: true,
  };
}

function convertComment(comment: Comment): FrontendComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    parentId: comment.parent_id ?? null,
    path: comment.path,
    depth: comment.depth ?? 0,
    author: {
      username: comment.author?.username || "unknown",
      avatar: comment.author?.avatar_url || undefined,
    },
    content: comment.text || "",
    audio_url: comment.audio_url || null,
    audioFile: comment.audio_url
      ? {
          url: comment.audio_url,
          title: "Audio",
          duration: 0,
        }
      : undefined,
    timestamp: new Date(comment.created_at),
    isLiked: comment.is_liked || false,
    likes: comment.likes_count || 0,
    repliesCount: comment.replies_count || 0,
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
  };
}

export const usePosts = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useCommunityPosts = (communityId: string) => {
  void communityId;
  return {
    data: [] as FrontendPost[],
    isLoading: false,
    error: null,
    refetch: () => {},
  };
};

export const useGlobalPosts = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getFeedPaginated,
    {},
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost).filter((post) => post.isGlobal === true),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const usePost = (postId: string) => {
  const result = useQuery(api.posts.getById, postId ? { postId: postId as Id<"posts"> } : "skip");

  return {
    data: result ? convertPost(result) : null,
    isLoading: result === undefined && !!postId,
    error: null,
    refetch: () => {},
  };
};

export const useComments = (postId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.getByPostPaginated,
    postId ? { postId: postId as Id<"posts"> } : "skip",
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertComment),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};

export const useCreateComment = () => {
  const createComment = useMutation(api.comments.create);
  const { user } = useAuthStore();
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { postId: string; content: string; audioFile?: File }) => {
    if (!user) throw new Error("User not authenticated");
    setIsPending(true);
    try {
      let audioUrl: string | undefined;
      if (variables.audioFile) {
        const uploaded = await uploadFile("audio", variables.audioFile);
        audioUrl = uploaded.url;
      }

      const result = await createComment({
        postId: variables.postId as Id<"posts">,
        text: variables.content || undefined,
        audioUrl,
      });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: { postId: string; content: string; audioFile?: File }, options?: FriendMutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useCreatePost = () => {
  const createPost = useMutation(api.posts.create);
  const { uploadFile } = useR2Upload();
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { content: string; audioFile?: File | null }) => {
    setIsPending(true);
    try {
      let audioUrl: string | undefined;
      if (variables.audioFile) {
        const uploaded = await uploadFile("audio", variables.audioFile);
        audioUrl = uploaded.url;
      }
      const result = await createPost({
        text: variables.content || undefined,
        audio_url: audioUrl,
      });
      return convertPost(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (variables: { content: string; audioFile?: File | null }, options?: FriendMutationOptions) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeletePost = () => {
  const deletePost = useMutation(api.posts.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (postId: string) => {
    setIsPending(true);
    try {
      await deletePost({ postId: postId as Id<"posts"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (postId: string, options?: FriendMutationOptions) => {
      run(postId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useToggleLike = () => {
  const toggleLike = useMutation(api.posts.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (postId: string) => {
    setIsPending(true);
    try {
      const result = await toggleLike({ postId: postId as Id<"posts"> });
      return convertPost(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (postId: string, options?: FriendMutationOptions) => {
      run(postId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useToggleCommentLike = () => {
  const toggleLike = useMutation(api.comments.toggleLike);
  const [isPending, setIsPending] = useState(false);

  const run = async (commentId: string) => {
    setIsPending(true);
    try {
      const result = await toggleLike({ commentId: commentId as Id<"comments"> });
      return convertComment(result);
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (commentId: string, options?: FriendMutationOptions) => {
      run(commentId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useUserPosts = (username: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.posts.getByUsernamePaginated,
    username ? { username } : "skip",
    { initialNumItems: 20 }
  );

  const flags = getPaginatedStatusFlags(status);

  return {
    data: results.map(convertPost),
    ...flags,
    fetchNextPage: () => loadMore(20),
    refetch: () => {},
  };
};
