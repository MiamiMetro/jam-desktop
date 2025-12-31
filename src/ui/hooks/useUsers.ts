import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOnlineUsers, fetchUser, fetchAllUsers, fetchConversations, fetchMessages, sendMessage, type User, type Message, type Conversation } from '@/lib/api/mock';

export const useOnlineUsers = () => {
  return useQuery<User[]>({
    queryKey: ['users', 'online'],
    queryFn: fetchOnlineUsers,
  });
};

export const useUser = (id: string) => {
  return useQuery<User | null>({
    queryKey: ['users', id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
};

export const useAllUsers = () => {
  return useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: fetchAllUsers,
  });
};

export const useConversations = (userId: string) => {
  return useQuery<Conversation[]>({
    queryKey: ['conversations', userId],
    queryFn: () => fetchConversations(userId),
    enabled: !!userId,
  });
};

export const useMessages = (userId: string, partnerId: string) => {
  return useQuery<Message[]>({
    queryKey: ['messages', userId, partnerId],
    queryFn: () => fetchMessages(userId, partnerId),
    enabled: !!userId && !!partnerId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ senderId, receiverId, content }: { senderId: string; receiverId: string; content: string }) =>
      sendMessage(senderId, receiverId, content),
    onSuccess: (_, variables) => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', variables.senderId, variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.senderId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.receiverId] });
    },
  });
};

