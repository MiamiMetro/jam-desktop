import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useState, useEffect } from "react";
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
 */
export const useFriends = (searchQuery?: string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;
  
  const [cursor, setCursor] = useState<Id<"friends"> | null | undefined>(null);
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(searchQuery);
  
  // Reset when search query changes
  useEffect(() => {
    if (currentSearch !== searchQuery) {
      setCurrentSearch(searchQuery);
      setCursor(null);
      setAllFriends([]);
      setIsInitialLoad(true);
    }
  }, [searchQuery, currentSearch]);
  
  // Query with current cursor and search
  const result = useQuery(
    api.friends.list,
    canQuery && cursor === null
      ? { limit: 50, search: currentSearch }
      : canQuery && cursor
        ? { limit: 50, cursor, search: currentSearch }
        : "skip"
  );
  
  // Reset friends when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data && canQuery) {
      setAllFriends(result.data.map(convertUser).filter((f): f is User => f !== null));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, canQuery]);
  
  // Append new friends when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && canQuery) {
      setAllFriends(prev => {
        // Avoid duplicates by checking if friend ID already exists
        const existingIds = new Set(prev.map(f => f.id));
        const newFriends = result.data
          .map(convertUser)
          .filter((f): f is User => f !== null && !existingIds.has(f.id));
        return [...prev, ...newFriends];
      });
    }
  }, [cursor, result?.data, canQuery]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllFriends([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allFriends,
    isLoading: isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
  };
};

/**
 * Get friend requests with cursor-based pagination
 * Realtime subscription for immediate notification
 */
export const useFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;
  
  const [cursor, setCursor] = useState<Id<"friends"> | null | undefined>(null);
  const [allRequests, setAllRequests] = useState<User[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Query with current cursor
  const result = useQuery(
    api.friends.getRequests,
    canQuery && cursor === null
      ? { limit: 20 }
      : canQuery && cursor
        ? { limit: 20, cursor }
        : "skip"
  );
  
  // Reset requests when cursor is null (first page)
  useEffect(() => {
    if (cursor === null && result?.data && canQuery) {
      setAllRequests(result.data.map(convertUser).filter((r): r is User => r !== null));
      setIsInitialLoad(false);
    }
  }, [cursor, result?.data, canQuery]);
  
  // Append new requests when cursor changes (loading next page)
  useEffect(() => {
    if (cursor !== null && cursor !== undefined && result?.data && canQuery) {
      setAllRequests(prev => {
        // Avoid duplicates by checking if request ID already exists
        const existingIds = new Set(prev.map(r => r.id));
        const newRequests = result.data
          .map(convertUser)
          .filter((r): r is User => r !== null && !existingIds.has(r.id));
        return [...prev, ...newRequests];
      });
    }
  }, [cursor, result?.data, canQuery]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      setCursor(result.nextCursor);
    }
  };
  
  const reset = () => {
    setCursor(null);
    setAllRequests([]);
    setIsInitialLoad(true);
  };
  
  return {
    data: allRequests,
    isLoading: isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: cursor !== null && cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
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

/**
 * Get pending friend requests sent by the current user
 * Returns a set of user IDs for easy lookup
 * Uses usePaginatedQuery for efficient cursor-based pagination
 */
export const useSentFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();

  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const { results, status } = usePaginatedQuery(
    api.friends.getSentRequests,
    canQuery ? {} : "skip",
    { initialNumItems: 50 }
  );

  // Convert to Set for O(1) lookup
  const sentRequestIds = new Set(results);

  return {
    data: sentRequestIds,
    isLoading: status === "LoadingFirstPage",
    hasPendingRequest: (userId: Id<"profiles"> | string) => sentRequestIds.has(userId as Id<"profiles">),
    hasMore: status === "CanLoadMore",
  };
};
