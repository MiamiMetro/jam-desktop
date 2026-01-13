import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from './useEnsureProfile';
import { useConvexAuthStore } from './useConvexAuth';
import type { User } from '@/lib/api/types';

// Convert Convex profile to User type
function convertUser(profile: any): User {
  return {
    id: profile.id || profile._id,
    username: profile.username,
    avatar: profile.avatar_url || undefined,
    display_name: profile.display_name,
    bio: profile.bio,
    status: profile.status,
    statusMessage: profile.statusMessage,
  };
}

export const useFriends = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;
  
  const result = useQuery(
    api.friends.list,
    canQuery ? { limit: 50 } : "skip"
  );
  
  const friends = result?.data?.map(convertUser) || [];
  const isLoading = result === undefined && canQuery;
  
  return {
    data: friends,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    error: null,
  };
};

export const useFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  
  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;
  
  const result = useQuery(
    api.friends.getRequests,
    canQuery ? { limit: 20 } : "skip"
  );
  
  const requests = result?.data?.map(convertUser) || [];
  const isLoading = result === undefined && canQuery;
  
  return {
    data: requests,
    isLoading,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
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
