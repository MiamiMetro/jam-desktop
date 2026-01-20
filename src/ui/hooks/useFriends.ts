import { useMutation, useConvex } from "convex/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from './useEnsureProfile';
import { useConvexAuthStore } from './useConvexAuth';
import type { User } from '@/lib/api/types';

// Convert Convex profile/friend data to User type
// Friends list returns a slightly different structure than profile, so we adapt it
function convertUser(profile: {
  id: string | Id<"profiles">;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  friends_since?: string;
} | null): User | null {
  if (!profile) return null;

  return {
    id: (typeof profile.id === 'string' ? profile.id : profile.id) as Id<"profiles">, // Keep as Id<"profiles"> to match User type
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    created_at: profile.created_at ?? profile.friends_since ?? new Date().toISOString(),
  };
}

/**
 * Get friends list with cursor-based pagination and server-side search
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const useFriends = (searchQuery?: string, userId?: Id<"profiles"> | string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const convex = useConvex();

  // Only query when fully authenticated AND profile is ready (unless fetching another user's friends)
  const canQuery = userId ? true : (!isGuest && isAuthSet && isProfileReady);

  const query = useInfiniteQuery({
    queryKey: ['friends', 'list', searchQuery, userId],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.friends.list, {
        limit: 50,
        search: searchQuery,
        userId: userId as Id<"profiles"> | undefined,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as Id<"friends"> | null,
    enabled: canQuery,
  });

  // Flatten all pages into a single array
  const allFriends = query.data?.pages.flatMap(page =>
    page.data.map(convertUser).filter((f): f is User => f !== null)
  ) ?? [];

  return {
    data: allFriends,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: null,
  };
};

/**
 * Get friend requests with cursor-based pagination
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const useFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const convex = useConvex();

  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const query = useInfiniteQuery({
    queryKey: ['friends', 'requests'],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.friends.getRequests, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as Id<"friends"> | null,
    enabled: canQuery,
  });

  // Flatten all pages into a single array
  const allRequests = query.data?.pages.flatMap(page =>
    page.data.map(convertUser).filter((r): r is User => r !== null)
  ) ?? [];

  return {
    data: allRequests,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: null,
  };
};

export const useRequestFriend = () => {
  const sendRequest = useMutation(api.friends.sendRequest);
  
  return {
    mutate: (userId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      sendRequest({ friendId: userId as Id<"profiles"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (userId: string) => {
      await sendRequest({ friendId: userId as Id<"profiles"> });
    },
    isPending: false,
  };
};

export const useAcceptFriend = () => {
  const acceptRequest = useMutation(api.friends.acceptRequest);
  
  return {
    mutate: (userId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      acceptRequest({ userId: userId as Id<"profiles"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (userId: string) => {
      await acceptRequest({ userId: userId as Id<"profiles"> });
    },
    isPending: false,
  };
};

export const useDeclineFriend = () => {
  // Decline uses remove - same as removing a friend request
  const removeFriend = useMutation(api.friends.remove);
  
  return {
    mutate: (userId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      removeFriend({ userId: userId as Id<"profiles"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (userId: string) => {
      await removeFriend({ userId: userId as Id<"profiles"> });
    },
    isPending: false,
  };
};

export const useDeleteFriend = () => {
  const removeFriend = useMutation(api.friends.remove);

  return {
    mutate: (userId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      removeFriend({ userId: userId as Id<"profiles"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (userId: string) => {
      await removeFriend({ userId: userId as Id<"profiles"> });
    },
    isPending: false,
  };
};

export const useCancelFriendRequest = () => {
  // Cancel uses remove - same as removing/declining a friend request
  const removeFriend = useMutation(api.friends.remove);

  return {
    mutate: (userId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      removeFriend({ userId: userId as Id<"profiles"> })
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error));
    },
    mutateAsync: async (userId: string) => {
      await removeFriend({ userId: userId as Id<"profiles"> });
    },
    isPending: false,
  };
};

/**
 * Get pending friend requests sent by the current user with full user data
 * Uses TanStack Query's useInfiniteQuery for optimal caching and performance
 */
export const useSentFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const convex = useConvex();

  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const query = useInfiniteQuery({
    queryKey: ['friends', 'sent-requests'],
    queryFn: async ({ pageParam }) => {
      const result = await convex.query(api.friends.getSentRequestsWithData, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as Id<"friends"> | null,
    enabled: canQuery,
  });

  // Flatten all pages into a single array
  const allSentRequests = query.data?.pages.flatMap(page =>
    page.data.map(convertUser).filter((r): r is User => r !== null)
  ) ?? [];

  // Helper function to check if a request was sent to a specific user
  const hasPendingRequest = (userId: Id<"profiles"> | string) => {
    return allSentRequests.some(req => req.id === userId);
  };

  return {
    data: allSentRequests,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: null,
    hasPendingRequest,
  };
};
