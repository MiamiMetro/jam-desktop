import { useQuery, useMutation, useConvex, usePaginatedQuery } from "convex/react";
import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { User } from "@/lib/api/types";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "./useEnsureProfile";
import { useConvexAuthStore } from "./useConvexAuth";

function convertUser(profile: {
  id: string | Id<"profiles">;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
}): User {
  return {
    id: (typeof profile.id === "string" ? profile.id : profile.id) as Id<"profiles">,
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    created_at: profile.created_at ?? new Date().toISOString(),
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
  };
}

function mergeAndDeduplicateMessages<T extends { id: string; _creationTime?: number }>(
  ...messageArrays: T[][]
): T[] {
  const allMessages = messageArrays.flat();
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const msg of allMessages) {
    const id = String(msg.id);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(msg);
    }
  }
  deduped.sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));
  return deduped;
}

interface UIMessage {
  id: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  audio_url?: string | null;
  timestamp?: string;
  _creationTime?: number;
}

function convertMessage(message: {
  id: string;
  sender_id: string;
  text?: string;
  audio_url?: string;
  created_at: string;
  _creationTime?: number;
}): UIMessage {
  return {
    id: message.id,
    senderId: message.sender_id,
    receiverId: undefined,
    content: message.text || "",
    audio_url: message.audio_url || null,
    timestamp: message.created_at,
    _creationTime: message._creationTime,
  };
}

interface UIConversation {
  id: string;
  userId: string;
  hasUnread: boolean;
  isGroup: boolean;
  name?: string;
  otherUser?: User;
  lastMessage?: {
    id: string;
    senderId?: string;
    content?: string;
    audio_url?: string | null;
    timestamp?: string;
  };
}

function convertConversation(conv: {
  id: string;
  isGroup: boolean;
  name?: string;
  hasUnread: boolean;
  other_user?: { id: string; username: string; display_name: string; avatar_url: string } | null;
  last_message?: { id: string; sender_id: string; text?: string; audio_url?: string; created_at: string } | null;
}): UIConversation {
  return {
    id: conv.id,
    userId: conv.other_user?.id || "",
    isGroup: conv.isGroup,
    name: conv.name,
    otherUser: conv.other_user
      ? {
          id: conv.other_user.id as Id<"profiles">,
          username: conv.other_user.username,
          display_name: conv.other_user.display_name ?? "",
          avatar_url: conv.other_user.avatar_url ?? "",
          bio: "",
          created_at: new Date().toISOString(),
        }
      : undefined,
    hasUnread: conv.hasUnread,
    lastMessage: conv.last_message
      ? {
          id: conv.last_message.id,
          senderId: conv.last_message.sender_id,
          content: conv.last_message.text || "",
          audio_url: conv.last_message.audio_url || null,
          timestamp: conv.last_message.created_at,
        }
      : undefined,
  };
}

export const useOnlineUsers = () => {
  const paginated = usePaginatedQuery(api.users.getOnline, {}, { initialNumItems: 50 });
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(convertUser),
    ...flags,
    fetchNextPage: () => paginated.loadMore(50),
    error: null,
  };
};

export const useUser = (username: string) => {
  const result = useQuery(api.profiles.getByUsername, username ? { username } : "skip");
  return {
    data: result ? convertUser(result) : null,
    isLoading: result === undefined && !!username,
    error: null,
  };
};

export const useAllUsers = (search?: string, enabled = true) => {
  const paginated = usePaginatedQuery(
    api.users.searchPaginated,
    enabled ? { search: search || undefined } : "skip",
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results.map(convertUser),
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    refetch: () => {},
    error: null,
  };
};

export const useConversationParticipants = (conversationId: string) => {
  const result = useQuery(
    api.messages.getParticipants,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );

  return {
    data: result ? result.map(convertUser) : [],
    isLoading: result === undefined && !!conversationId,
    error: null,
  };
};

export const useConversations = (userId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId;

  const paginated = usePaginatedQuery(
    api.messages.getConversationsPaginated,
    canQuery ? {} : "skip",
    { initialNumItems: 50 }
  );
  const flags = getPaginatedStatusFlags(paginated.status);
  const conversations = paginated.results.map(convertConversation);

  return {
    data: conversations,
    isLoading: canQuery ? flags.isLoading : false,
    hasNextPage: canQuery ? flags.hasNextPage : false,
    isFetchingNextPage: canQuery ? flags.isFetchingNextPage : false,
    fetchNextPage: () => paginated.loadMore(50),
    refetch: () => {},
    error: null,
  };
};

export const useEnsureDmConversation = () => {
  const ensureDm = useMutation(api.messages.ensureDmWithUser);
  const [isPending, setIsPending] = useState(false);

  const run = async (partnerId: string) => {
    setIsPending(true);
    try {
      const result = await ensureDm({ userId: partnerId as Id<"profiles"> });
      return result.conversationId as string;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (
      partnerId: string,
      options?: { onSuccess?: (conversationId: string) => void; onError?: (error: Error) => void }
    ) => {
      run(partnerId)
        .then((conversationId) => options?.onSuccess?.(conversationId))
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useMessages = (userId: string, conversationId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId && conversationId;

  type LocalUIMessage = ReturnType<typeof convertMessage>;
  const [olderMessages, setOlderMessages] = useState<LocalUIMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLastReadMessageAt, setInitialLastReadMessageAt] = useState<number | null>(null);
  const [hasInitializedLastRead, setHasInitializedLastRead] = useState(false);
  const previousConversationIdRef = useRef<string | null>(null);
  const conversationOpenedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!conversationId) {
      previousConversationIdRef.current = null;
      setOlderMessages([]);
      setNextCursor(null);
      setHasMore(false);
      setIsLoadingMore(false);
      setInitialLastReadMessageAt(null);
      setHasInitializedLastRead(false);
      return;
    }
    if (previousConversationIdRef.current === conversationId) return;
    previousConversationIdRef.current = conversationId;
    setOlderMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingMore(false);
    setInitialLastReadMessageAt(null);
    setHasInitializedLastRead(false);
    conversationOpenedAtRef.current = Date.now();
  }, [conversationId]);

  const firstPageResult = useQuery(
    api.messages.getByConversationPaginated,
    canQuery ? { conversationId: conversationId as Id<"conversations">, limit: 50 } : "skip"
  );

  useEffect(() => {
    if (firstPageResult?.data && !hasInitializedLastRead) {
      setInitialLastReadMessageAt(firstPageResult.lastReadMessageAt ?? null);
      setHasInitializedLastRead(true);
    }
    if (firstPageResult && olderMessages.length === 0) {
      setNextCursor(firstPageResult.nextCursor ?? null);
      setHasMore(firstPageResult.hasMore ?? false);
    }
  }, [firstPageResult, hasInitializedLastRead, olderMessages.length]);

  const convex = useConvex();

  const fetchNextPage = async () => {
    if (!nextCursor || isLoadingMore || !canQuery) return;

    setIsLoadingMore(true);
    try {
      const olderResult = await convex.query(api.messages.getByConversationPaginated, {
        conversationId: conversationId as Id<"conversations">,
        limit: 50,
        cursor: nextCursor,
      });

      if (olderResult?.data) {
        const newOlderMessages = olderResult.data.map(convertMessage);
        const currentFirstPage = firstPageResult?.data?.map(convertMessage) ?? [];

        setOlderMessages((prev) =>
          mergeAndDeduplicateMessages(newOlderMessages, prev, currentFirstPage)
        );
        setNextCursor(olderResult.nextCursor ?? null);
        setHasMore(olderResult.hasMore ?? false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const allMessages = useMemo(() => {
    if (!firstPageResult?.data) return olderMessages;
    const firstPageMessages = firstPageResult.data.map(convertMessage);
    const firstPageIds = new Set(firstPageMessages.map((m) => String(m.id)));
    const dedupedOlder = olderMessages.filter((m) => !firstPageIds.has(String(m.id)));
    return [...dedupedOlder, ...firstPageMessages];
  }, [olderMessages, firstPageResult?.data]);

  const reset = () => {
    setOlderMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingMore(false);
    setInitialLastReadMessageAt(null);
    setHasInitializedLastRead(false);
  };

  const isInitialLoad = firstPageResult === undefined && canQuery;

  return {
    data: allMessages,
    isLoading: isInitialLoad,
    hasNextPage: hasMore,
    isFetchingNextPage: isLoadingMore,
    fetchNextPage,
    refetch: reset,
    lastReadMessageAt: initialLastReadMessageAt,
    conversationOpenedAt: conversationOpenedAtRef.current,
    otherParticipantLastRead: firstPageResult?.otherParticipantLastRead ?? null,
    error: null,
  };
};

export const useSendMessage = () => {
  const sendMessage = useMutation(api.messages.send);
  const [isPending, setIsPending] = useState(false);

  const run = async (variables: { conversationId: string; content: string }) => {
    setIsPending(true);
    try {
      const result = await sendMessage({
        conversationId: variables.conversationId as Id<"conversations">,
        text: variables.content || undefined,
      });
      return {
        id: result.id,
        senderId: result.sender_id,
        content: result.text || "",
        audio_url: result.audio_url || null,
        timestamp: result.created_at,
      };
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (
      variables: { conversationId: string; content: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      run(variables)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useMarkAsRead = () => {
  const markAsRead = useMutation(api.messages.markAsRead);
  return {
    mutate: (conversationId: string) => {
      markAsRead({ conversationId: conversationId as Id<"conversations"> }).catch((error) =>
        console.error("Failed to mark as read:", error)
      );
    },
    mutateAsync: async (conversationId: string) => {
      return await markAsRead({ conversationId: conversationId as Id<"conversations"> });
    },
  };
};
