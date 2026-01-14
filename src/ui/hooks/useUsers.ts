import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { User, Message, Conversation } from '@/lib/api/types';
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

// Convert Convex message to UI-friendly Message format
// Convex Message has: id, conversation_id, sender_id, text, audio_url, created_at
// UI expects: id, senderId, receiverId, content, audio_url, timestamp, isRead
function convertMessage(message: Message): {
  id: string;
  senderId?: string;
  receiverId?: string;
  content?: string;
  audio_url?: string | null;
  timestamp?: string;
  isRead?: boolean;
} {
  return {
    id: message.id,
    senderId: message.sender_id,
    receiverId: undefined, // Not available in Convex message
    content: message.text || '',
    audio_url: message.audio_url || null,
    timestamp: message.created_at,
    isRead: false, // Not tracked in Convex currently
  };
}

// Convert Convex conversation to UI-friendly Conversation format
// Convex Conversation has: id, other_user, last_message, updated_at
// UI expects: id, userId, lastMessage, unreadCount
function convertConversation(conv: Conversation): {
  id: string;
  userId: string;
  lastMessage?: {
    id: string;
    senderId?: string;
    receiverId?: string;
    content?: string;
    audio_url?: string | null;
    timestamp?: string;
    isRead?: boolean;
  };
  unreadCount: number;
} {
  return {
    id: conv.id,
    userId: conv.other_user?.id || '',
    lastMessage: conv.last_message ? convertMessage(conv.last_message) : undefined,
    unreadCount: 0, // Not tracked in Convex currently
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
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId;
  
  const [cursor, setCursor] = useState<Id<"conversations"> | null | undefined>(null);
  // Use UI-friendly conversation type (converted from Convex)
  type UIConversation = ReturnType<typeof convertConversation>;
  const [allConversations, setAllConversations] = useState<UIConversation[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset when userId changes
  useEffect(() => {
    if (userId) {
      setCursor(null);
      setAllConversations([]);
      setIsInitialLoad(true);
    }
  }, [userId]);
  
  // Query with current cursor
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
        const existingIds = new Set(prev.map(c => String(c.id)));
        const newConversations = result.data
          .map(convertConversation)
          .filter(conv => !existingIds.has(String(conv.id)));
        return [...prev, ...newConversations];
      });
    }
  }, [cursor, result?.data, canQuery, userId]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor as Id<"conversations">);
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
export const useMessages = (userId: string, partnerId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId && partnerId;
  
  const [cursor, setCursor] = useState<Id<"messages"> | null | undefined>(null);
  // Use UI-friendly message type (converted from Convex)
  type UIMessage = ReturnType<typeof convertMessage>;
  const [allMessages, setAllMessages] = useState<UIMessage[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Reset when partner changes
  useEffect(() => {
    if (partnerId) {
      setCursor(null);
      setAllMessages([]);
      setIsInitialLoad(true);
    }
  }, [partnerId]);
  
  // Query with current cursor
  const result = useQuery(
    api.messages.getWithUser,
    canQuery && cursor === null
      ? { userId: partnerId as Id<"profiles">, limit: 50 }
      : canQuery && cursor
        ? { userId: partnerId as Id<"profiles">, limit: 50, cursor }
        : "skip"
  );
  
  // Reset messages when cursor is null (first page or partner change)
  useEffect(() => {
    if (cursor === null && result?.data && canQuery && partnerId) {
      // Messages are already returned oldest first from the backend
      setAllMessages(result.data.map(convertMessage));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, canQuery, partnerId]);
  
  // Prepend older messages when cursor changes (loading previous page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && canQuery && partnerId) {
      setAllMessages(prev => {
        // Avoid duplicates by checking if message ID already exists
        const existingIds = new Set(prev.map(m => String(m.id)));
        const olderMessages = result.data
          .map(convertMessage)
          .filter(msg => !existingIds.has(String(msg.id)));
        // Prepend older messages (they're oldest first from backend)
        return [...olderMessages, ...prev];
      });
    }
  }, [cursor, result?.data, canQuery, partnerId]);
  
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
      return convertMessage(result);
    },
    isPending: false,
  };
};
