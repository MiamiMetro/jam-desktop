import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "./useEnsureProfile";
import { useConvexAuthStore } from "./useConvexAuth";
import type { User } from "@/lib/api/types";

function convertUser(profile: {
  id: string | Id<"profiles">;
  username: string;
  display_name?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  instruments?: string[];
  genres?: string[];
  dm_privacy?: "friends" | "everyone";
  account_state?: "active" | "deactivated" | "suspended" | "banned" | "deleted";
  state_changed_at?: string;
  created_at?: string;
  friends_since?: string;
} | null): User | null {
  if (!profile) return null;

  return {
    id: (typeof profile.id === "string" ? profile.id : profile.id) as Id<"profiles">,
    username: profile.username,
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
    bio: profile.bio ?? "",
    instruments: profile.instruments ?? [],
    genres: profile.genres ?? [],
    dm_privacy: profile.dm_privacy ?? "friends",
    account_state: profile.account_state ?? "active",
    state_changed_at: profile.state_changed_at ?? new Date().toISOString(),
    created_at: profile.created_at ?? profile.friends_since ?? new Date().toISOString(),
  };
}

function getPaginatedStatusFlags(status: string) {
  return {
    isLoading: status === "LoadingFirstPage",
    hasNextPage: status === "CanLoadMore",
    isFetchingNextPage: status === "LoadingMore",
  };
}

type MutationOptions = { onSuccess?: () => void; onError?: (error: Error) => void };

export const useFriends = (searchQuery?: string, userId?: Id<"profiles"> | string) => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();

  const canQuery = userId ? true : !isGuest && isAuthSet && isProfileReady;
  const trimmedSearch = searchQuery?.trim();

  const paginated = usePaginatedQuery(
    api.friends.listPaginated,
    canQuery
      ? {
          userId: userId as Id<"profiles"> | undefined,
          search: trimmedSearch || undefined,
        }
      : "skip",
    { initialNumItems: 50 }
  );

  const flags = getPaginatedStatusFlags(paginated.status);
  const allFriends = paginated.results
    .map(convertUser)
    .filter((f): f is User => f !== null);

  return {
    data: allFriends,
    ...flags,
    fetchNextPage: () => paginated.loadMore(50),
    refetch: () => {},
    error: null,
  };
};

export const useFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const paginated = usePaginatedQuery(
    api.friends.getRequestsPaginated,
    canQuery ? {} : "skip",
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  return {
    data: paginated.results
      .map(convertUser)
      .filter((r): r is User => r !== null),
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    refetch: () => {},
    error: null,
  };
};

export const useRequestFriend = () => {
  const sendRequest = useMutation(api.friends.sendRequest);
  const [isPending, setIsPending] = useState(false);

  const run = async (userId: string) => {
    setIsPending(true);
    try {
      await sendRequest({ friendId: userId as Id<"profiles"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useAcceptFriend = () => {
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const [isPending, setIsPending] = useState(false);

  const run = async (userId: string) => {
    setIsPending(true);
    try {
      await acceptRequest({ userId: userId as Id<"profiles"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeclineFriend = () => {
  const removeFriend = useMutation(api.friends.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (userId: string) => {
    setIsPending(true);
    try {
      await removeFriend({ userId: userId as Id<"profiles"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useDeleteFriend = () => {
  const removeFriend = useMutation(api.friends.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (userId: string) => {
    setIsPending(true);
    try {
      await removeFriend({ userId: userId as Id<"profiles"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useCancelFriendRequest = () => {
  const removeFriend = useMutation(api.friends.remove);
  const [isPending, setIsPending] = useState(false);

  const run = async (userId: string) => {
    setIsPending(true);
    try {
      await removeFriend({ userId: userId as Id<"profiles"> });
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (userId: string, options?: MutationOptions) => {
      run(userId)
        .then(() => options?.onSuccess?.())
        .catch((error) => options?.onError?.(error as Error));
    },
    mutateAsync: run,
    isPending,
  };
};

export const useSentFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const paginated = usePaginatedQuery(
    api.friends.getSentRequestsWithDataPaginated,
    canQuery ? {} : "skip",
    { initialNumItems: 20 }
  );
  const flags = getPaginatedStatusFlags(paginated.status);

  const allSentRequests = paginated.results
    .map(convertUser)
    .filter((r): r is User => r !== null);

  const hasPendingRequest = (userId: Id<"profiles"> | string) => {
    return allSentRequests.some((req) => req.id === userId);
  };

  return {
    data: allSentRequests,
    ...flags,
    fetchNextPage: () => paginated.loadMore(20),
    refetch: () => {},
    error: null,
    hasPendingRequest,
  };
};
