import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { usersApi, messagesApi, profilesApi } from '@/lib/api/api';
import type { User, Message, Conversation } from '@/lib/api/types';

export const useOnlineUsers = () => {
  const query = useInfiniteQuery<User[], Error>({
    queryKey: ['users', 'online'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await usersApi.getOnlineUsers({ limit: 50, offset: pageParam as number });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 50) return undefined;
      return (lastPageParam as number) + 50;
    },
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const useUser = (username: string) => {
  return useQuery<User | null>({
    queryKey: ['user', username],
    queryFn: async () => {
      if (!username) return null;
      return await profilesApi.getProfile(username);
    },
    enabled: !!username,
    retry: 1,
  });
};

export const useAllUsers = (search?: string, enabled: boolean = true) => {
  const query = useInfiniteQuery<User[], Error>({
    queryKey: ['users', 'all', search],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await usersApi.getUsers({ 
        limit: 20, 
        offset: pageParam as number,
        search: search || undefined,
      });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
    enabled,
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const useConversations = (userId: string) => {
  const query = useInfiniteQuery<Conversation[], Error>({
    queryKey: ['conversations', userId],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await messagesApi.getConversations({ limit: 50, offset: pageParam as number });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 50) return undefined;
      return (lastPageParam as number) + 50;
    },
    enabled: !!userId,
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const useMessages = (userId: string, partnerId: string) => {
  const query = useInfiniteQuery<Message[], Error>({
    queryKey: ['messages', userId, partnerId],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await messagesApi.getMessages(partnerId, { limit: 50, offset: pageParam as number });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 50) return undefined;
      return (lastPageParam as number) + 50;
    },
    enabled: !!userId && !!partnerId,
  });
  
  return {
    ...query,
    data: query.data?.pages.flat().reverse() || [], // Reverse to show oldest first
  };
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ receiverId, content }: { senderId: string; receiverId: string; content: string }) => {
      // Audio upload is not implemented yet
      const message = await messagesApi.sendMessage({
        recipient_id: receiverId,
        text: content || undefined,
        audio_url: null,
      });
      
      return message;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', variables.senderId, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.senderId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.receiverId] });
    },
  });
};
