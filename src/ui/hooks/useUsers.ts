import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { User, Message, Conversation } from '@/lib/api/types';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from './useEnsureProfile';
import { useConvexAuthStore } from './useConvexAuth';

// Convert Convex profile to User type
function convertUser(profile: any): User {
  return {
    id: profile.id || profile._id,
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
    content: message.text || '',
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

export const useAllUsers = (search?: string, enabled: boolean = true) => {
  const result = useQuery(
    api.users.search,
    enabled ? { search: search || undefined, limit: 20 } : "skip"
  );
  
  const users = result?.data?.map(convertUser) || [];
  const isLoading = result === undefined && enabled;
  
  return {
    data: users,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    error: null,
  };
};

export const useConversations = (userId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId;
  
  const result = useQuery(
    api.messages.getConversations,
    canQuery ? { limit: 50 } : "skip"
  );
  
  const conversations = result?.data?.map(convertConversation) || [];
  const isLoading = result === undefined && canQuery;
  
  return {
    data: conversations,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    error: null,
  };
};

export const useMessages = (userId: string, partnerId: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady && userId && partnerId;
  
  const result = useQuery(
    api.messages.getWithUser,
    canQuery ? { userId: partnerId as Id<"profiles">, limit: 50 } : "skip"
  );
  
  // Messages are already returned oldest first from the backend
  const messages = result?.data?.map(convertMessage) || [];
  const isLoading = result === undefined && canQuery;
  
  return {
    data: messages,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
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
