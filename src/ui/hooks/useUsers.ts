import { useQuery, useMutation, useConvex } from "convex/react";
import { useState, useEffect, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { User } from '@/lib/api/types';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from './useEnsureProfile';
import { useConvexAuthStore } from './useConvexAuth';

// Convert Convex profile to User type (handles Id<"profiles"> to string conversion)
function convertUser(profile: {
  id: string | Id<"profiles">;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
}): User {
  return {
    id: (typeof profile.id === 'string' ? profile.id : profile.id) as Id<"profiles">,
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    created_at: profile.created_at ?? new Date().toISOString(),
  };
}

/**
 * Merges and deduplicates message arrays, sorting by creation time.
 * Used when loading older messages to combine with existing messages.
 */
function mergeAndDeduplicateMessages<T extends { id: string; _creationTime?: number }>(
  ...messageArrays: T[][]
): T[] {
  const allMessages = messageArrays.flat();
  
  // Dedupe by ID, keeping earliest occurrence (preserves order)
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const msg of allMessages) {
    const id = String(msg.id);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(msg);
    }
  }
  
  // Sort by _creationTime to ensure correct order (oldest first)
  deduped.sort((a, b) => (a._creationTime ?? 0) - (b._creationTime ?? 0));
  
  return deduped;
}

// UI-friendly message type
interface UIMessage {
  id: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  audio_url?: string | null;
  timestamp?: string;
  _creationTime?: number;
}

// Convert Convex message to UI-friendly format
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
    content: message.text || '',
    audio_url: message.audio_url || null,
    timestamp: message.created_at,
    _creationTime: message._creationTime,
  };
}

// UI-friendly conversation type with hasUnread
interface UIConversation {
  id: string;
  userId: string;
  hasUnread: boolean;
  lastMessage?: {
    id: string;
    senderId?: string;
    content?: string;
    audio_url?: string | null;
    timestamp?: string;
  };
}

// Convert new conversation format (with hasUnread) to UI type
function convertConversation(conv: {
  id: string;
  hasUnread: boolean;
  other_user?: { id: string; username: string; display_name: string; avatar_url: string } | null;
  last_message?: { id: string; sender_id: string; text?: string; audio_url?: string; created_at: string } | null;
}): UIConversation {
  return {
    id: conv.id,
    userId: conv.other_user?.id || '',
    hasUnread: conv.hasUnread,
    lastMessage: conv.last_message ? {
      id: conv.last_message.id,
      senderId: conv.last_message.sender_id,
      content: conv.last_message.text || '',
      audio_url: conv.last_message.audio_url || null,
      timestamp: conv.last_message.created_at,
    } : undefined,
  };
}

export const useOnlineUsers = () => {
  const result = useQuery(api.users.getOnline, { limit: 50 });
  
  const users = result?.data?.map(convertUser) || [];
  const isLoading = result === undefined;
  
  return {
    data: users,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    error: null,
  };
};

export const useUser = (username: string) => {
  const result = useQuery(
    api.profiles.getByUsername,
    username ? { username } : "skip"
  );
  
  return {
    data: result ? convertUser(result) : null,
    isLoading: result === undefined && !!username,
    error: null,
  };
};

/**
 * Get all users with search and cursor-based pagination
 * Supports load more button for search results
 */
export const useAllUsers = (search?: string, enabled: boolean = true) => {
  const [cursor, setCursor] = useState<Id<"profiles"> | null | undefined>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search);
  
  // Reset when search query changes - this is a valid pattern for resetting pagination
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search);
      setCursor(null);
      setAllUsers([]);
      setIsInitialLoad(true);
    }
  }, [search, currentSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  // Query with current cursor and search
  const result = useQuery(
    api.users.search,
    enabled && cursor === null
      ? { search: currentSearch || undefined, limit: 20 }
      : enabled && cursor
        ? { search: currentSearch || undefined, limit: 20, cursor }
        : "skip"
  );
  
  // Reset users when cursor is null (first page)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (cursor === null && result?.data && enabled) {
      setAllUsers(result.data.map(convertUser));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, enabled]);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  // Append new users when cursor changes (loading next page)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && enabled) {
      setAllUsers(prev => {
        // Avoid duplicates by checking if user ID already exists
        const existingIds = new Set(prev.map(u => u.id));
        const newUsers = result.data
          .map(convertUser)
          .filter(user => !existingIds.has(user.id));
        return [...prev, ...newUsers];
      });
    }
  }, [cursor, result?.data, enabled]);
  /* eslint-enable react-hooks/set-state-in-effect */
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllUsers([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allUsers,
    isLoading: isInitialLoad && result === undefined && enabled,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
  };
};

/**
 * Get conversations list with hasUnread status
 * Uses reactive Convex query - auto-updates when data changes
 */
export const useConversations = (userId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId;
  
  // Reactive query - auto-updates when conversations change
  const result = useQuery(
    api.messages.getConversations,
    canQuery ? { limit: 50 } : "skip"
  );
  
  // Convert to UI format
  const conversations = result?.data?.map(convertConversation) || [];
  
  return {
    data: conversations,
    isLoading: result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {}, // Not needed for now - reactive query handles updates
    refetch: () => {},
    error: null,
  };
};

/**
 * Get messages with a user (reverse infinite scroll for loading older messages)
 * 
 * Architecture:
 * - Always subscribe to the FIRST page (newest 50 messages) for real-time updates
 * - When "Load more" is clicked, fetch older pages and accumulate them client-side
 * - Merge older messages at the front, keeping the reactive first page at the end
 * 
 * Cursor Implementation:
 * - Uses `_creationTime` (number) as cursor instead of `Id<"messages">`
 * - `_creationTime` provides stable, chronological ordering for pagination
 * - More efficient for time-based queries and sorting older messages
 * - Allows the backend to use indexed queries on creation time for better performance
 */
export const useMessages = (userId: string, partnerId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId && partnerId;
  
  type UIMessage = ReturnType<typeof convertMessage>;
  
  // Older messages loaded via "Load more" (accumulated client-side)
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([]);
  // Track the cursor for the next "Load more" click
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  // Track if we have more pages to load
  const [hasMore, setHasMore] = useState(false);
  // Track if we're currently loading older messages
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Initial lastReadMessageAt - captured once when conversation opens
  const [initialLastReadMessageAt, setInitialLastReadMessageAt] = useState<number | null>(null);
  const [hasInitializedLastRead, setHasInitializedLastRead] = useState(false);
  // Track when conversation was opened
  const [conversationOpenedAt, setConversationOpenedAt] = useState<number | null>(null);
  
  // Reset when partner changes
  useEffect(() => {
    if (partnerId) {
      setOlderMessages([]);
      setNextCursor(null);
      setHasMore(false);
      setIsLoadingMore(false);
      setInitialLastReadMessageAt(null);
      setHasInitializedLastRead(false);
      setConversationOpenedAt(Date.now());
    }
  }, [partnerId]);
  
  // ALWAYS subscribe to the first page (newest messages) - this stays reactive
  const firstPageResult = useQuery(
    api.messages.getWithUser,
    canQuery ? { userId: partnerId as Id<"profiles">, limit: 50 } : "skip"
  );
  
  // Capture initial metadata from first page
  useEffect(() => {
    if (firstPageResult?.data && !hasInitializedLastRead) {
      setInitialLastReadMessageAt(firstPageResult.lastReadMessageAt ?? null);
      setHasInitializedLastRead(true);
    }
    // Update cursor and hasMore from first page result
    if (firstPageResult) {
      // Only set nextCursor if we haven't loaded any older messages yet
      if (olderMessages.length === 0) {
        setNextCursor(firstPageResult.nextCursor ?? null);
      }
      // Has more is true if first page says so AND we haven't loaded everything
      if (olderMessages.length === 0) {
        setHasMore(firstPageResult.hasMore ?? false);
      }
    }
  }, [firstPageResult, hasInitializedLastRead, olderMessages.length]);
  
  // Convex fetchQuery for loading older pages (non-reactive, one-time fetch)
  const convex = useConvex();
  
  const fetchNextPage = async () => {
    if (!nextCursor || isLoadingMore || !canQuery) return;
    
    setIsLoadingMore(true);
    try {
      const olderResult = await convex.query(api.messages.getWithUser, {
        userId: partnerId as Id<"profiles">,
        limit: 50,
        cursor: nextCursor,
      });
      
      if (olderResult?.data) {
        const newOlderMessages = olderResult.data.map(convertMessage);
        
        // Also capture current first page messages to prevent them from disappearing
        // when new messages arrive and shift the first page
        const currentFirstPage = firstPageResult?.data?.map(convertMessage) ?? [];
        
        setOlderMessages(prev => 
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
  
  // Combine older messages + first page (reactive)
  // Older messages come first, then first page messages
  const allMessages = useMemo(() => {
    if (!firstPageResult?.data) return olderMessages;
    
    const firstPageMessages = firstPageResult.data.map(convertMessage);
    
    // Dedupe: remove from olderMessages any that appear in firstPage
    const firstPageIds = new Set(firstPageMessages.map(m => String(m.id)));
    const dedupedOlder = olderMessages.filter(m => !firstPageIds.has(String(m.id)));
    
    // Combine: older messages first, then first page
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
    conversationOpenedAt,
    redirect: firstPageResult && 'redirect' in firstPageResult ? firstPageResult.redirect : false,
    canonicalConversationId: firstPageResult && 'canonicalConversationId' in firstPageResult 
      ? (firstPageResult.canonicalConversationId as string) 
      : null,
    error: null,
  };
};

export const useSendMessage = () => {
  const sendMessage = useMutation(api.messages.send);
  
  return {
    mutate: (
      variables: { senderId: string; receiverId: string; content: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      sendMessage({
        recipient_id: variables.receiverId as Id<"profiles">,
        text: variables.content || undefined,
      })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (variables: { senderId: string; receiverId: string; content: string }) => {
      const result = await sendMessage({
        recipient_id: variables.receiverId as Id<"profiles">,
        text: variables.content || undefined,
      });
      // Convert to UI format
      return {
        id: result.id,
        senderId: result.sender_id,
        content: result.text || '',
        audio_url: result.audio_url || null,
        timestamp: result.created_at,
      };
    },
    isPending: false,
  };
};

/**
 * Mark conversation as read
 * Only patches if there's something NEW to mark as read (saves writes)
 */
export const useMarkAsRead = () => {
  const markAsRead = useMutation(api.messages.markAsRead);
  
  return {
    mutate: (recipientId: string) => {
      markAsRead({ recipientId: recipientId as Id<"profiles"> })
        .catch((error) => console.error('Failed to mark as read:', error));
    },
    mutateAsync: async (recipientId: string) => {
      return await markAsRead({ recipientId: recipientId as Id<"profiles"> });
    },
  };
};
