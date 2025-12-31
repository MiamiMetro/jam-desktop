import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { friendsApi } from '@/lib/api/api';
import type { User } from '@/lib/api/types';

export const useFriends = () => {
  const query = useInfiniteQuery<User[], Error>({
    queryKey: ['friends'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await friendsApi.getFriends({ limit: 50, offset: pageParam as number });
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

export const useFriendRequests = () => {
  const query = useInfiniteQuery<User[], Error>({
    queryKey: ['friends', 'requests'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await friendsApi.getFriendRequests({ limit: 20, offset: pageParam as number });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 20;
    },
  });
  
  return {
    ...query,
    data: query.data?.pages.flat() || [],
  };
};

export const useRequestFriend = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => friendsApi.requestFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
};

export const useAcceptFriend = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => friendsApi.acceptFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
};

export const useDeleteFriend = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => friendsApi.deleteFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
};

