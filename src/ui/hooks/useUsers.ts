import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { User, Message, Conversation } from '@/lib/api/types';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from './useEnsureProfile';

// Convert Convex profile to User type
function convertUser(profile: any): User {
  return {
    id: profile.id || profile._id,
    account_id: profile.account_id,
    username: profile.username,
    avatar: profile.avatar_url || undefined,
    display_name: profile.display_name,
    bio: profile.bio,
    status: profile.status || 'offline',
    statusMessage: profile.statusMessage || '',
  };
}

// Convert Convex message to Message type
function convertMessage(message: any): Message {
  return {
    id: message.id || message._id,
    senderId: message.sender_id,
    receiverId: message.receiver_id,
    content: message.content || '',
    audio_url: message.audio_url || null,
    timestamp: message.created_at || message._creationTime,
    isRead: message.is_read || false,
  };
}

// Convert Convex conversation to Conversation type
function convertConversation(conv: any): Conversation {
  return {
    id: conv.id || conv._id,
    userId: conv.other_user?.id || conv.userId,
    lastMessage: conv.last_message ? convertMessage(conv.last_message) : undefined,
    unreadCount: conv.unreadCount || 0,
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
  
  // Reset when search query changes
  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search);
      setCursor(null);
      setAllUsers([]);
      setIsInitialLoad(true);
    }
  }, [search, currentSearch]);
  
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
  useEffect(() => {
    if (cursor === null && result?.data && enabled) {
      setAllUsers(result.data.map(convertUser));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, enabled]);
  
  // Append new users when cursor changes (loading next page)
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
 * Get conversations list with cursor-based pagination
 * Supports load more button
 */
export const useConversations = (userId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthenticated } = useConvexAuth();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthenticated && isProfileReady && userId;
  
  const [cursor, setCursor] = useState<number | null | undefined>(null);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset when userId changes
  useEffect(() => {
    if (userId) {
      setCursor(null);
      setAllConversations([]);
      setIsInitialLoad(true);
    }
  }, [userId]);
  
  // Query with current cursor (cursor is now a timestamp)
  const result = useQuery(
    api.messages.getConversations,
    canQuery && cursor === null
      ? { limit: 50 }
      : canQuery && cursor
        ? { limit: 50, cursor }
        : "skip"
  );
  
  // Reset conversations when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data && canQuery && userId) {
      setAllConversations(result.data.map(convertConversation));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, canQuery, userId]);
  
  // Append new conversations when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && canQuery && userId) {
      setAllConversations(prev => {
        // Avoid duplicates by checking if conversation ID already exists
        const existingIds = new Set(prev.map(c => c.id));
        const newConversations = result.data
          .map(convertConversation)
          .filter(conv => !existingIds.has(conv.id));
        return [...prev, ...newConversations];
      });
    }
  }, [cursor, result?.data, canQuery, userId]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllConversations([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allConversations,
    isLoading: isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
  };
};

/**
 * Get messages with a user (reverse infinite scroll for loading older messages)
 * Supports cursor-based pagination - loads older messages at the top
 */
export const useMessages = (userId: string, partnerAccountId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthenticated } = useConvexAuth();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthenticated && isProfileReady && userId && partnerAccountId;
  
  const [cursor, setCursor] = useState<number | null | undefined>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset when partner changes
  useEffect(() => {
    if (partnerAccountId) {
      setCursor(null);
      setAllMessages([]);
      setIsInitialLoad(true);
    }
  }, [partnerAccountId]);
  
  // Query with current cursor (cursor is now a timestamp)
  const result = useQuery(
    api.messages.getWithUser,
    canQuery && cursor === null
      ? { targetAccountId: partnerAccountId as Id<"accounts">, limit: 50 }
      : canQuery && cursor
        ? { targetAccountId: partnerAccountId as Id<"accounts">, limit: 50, cursor }
        : "skip"
  );
  
  // Reset messages when cursor is null (first page or partner change)
  useEffect(() => {
    if (cursor === null && result?.data && canQuery && partnerAccountId) {
      // Messages are already returned oldest first from the backend
      setAllMessages(result.data.map(convertMessage));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, canQuery, partnerAccountId]);
  
  // Prepend older messages when cursor changes (loading previous page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && canQuery && partnerAccountId) {
      setAllMessages(prev => {
        // Avoid duplicates by checking if message ID already exists
        const existingIds = new Set(prev.map(m => m.id));
        const olderMessages = result.data
          .map(convertMessage)
          .filter(msg => !existingIds.has(msg.id));
        // Prepend older messages (they're oldest first from backend)
        return [...olderMessages, ...prev];
      });
    }
  }, [cursor, result?.data, canQuery, partnerAccountId]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllMessages([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allMessages,
    isLoading: isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
  };
};

export const useSendMessage = () => {
  const sendMessage = useMutation(api.messages.send);
  
  return {
    mutate: (
      variables: { senderId: string; receiverAccountId: string; content: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      sendMessage({
        recipientAccountId: variables.receiverAccountId as Id<"accounts">,
        content: variables.content,
      })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (variables: { senderId: string; receiverAccountId: string; content: string }) => {
      const result = await sendMessage({
        recipientAccountId: variables.receiverAccountId as Id<"accounts">,
        content: variables.content,
      });
      return convertMessage(result);
    },
    isPending: false,
  };
};
