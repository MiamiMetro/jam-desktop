import { useQuery, useMutation } from "convex/react";
import { useEffect, useReducer, useRef } from "react";
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

type FriendsState = {
  cursor: Id<"friends"> | null | undefined;
  allFriends: User[];
  isInitialLoad: boolean;
  currentSearch: string | undefined;
};

type FriendsAction =
  | { type: 'RESET'; search?: string }
  | { type: 'SET_CURSOR'; cursor: Id<"friends"> }
  | { type: 'SET_INITIAL_DATA'; data: User[] }
  | { type: 'APPEND_DATA'; data: User[] };

function friendsReducer(state: FriendsState, action: FriendsAction): FriendsState {
  switch (action.type) {
    case 'RESET':
      return {
        cursor: null,
        allFriends: [],
        isInitialLoad: true,
        currentSearch: action.search,
      };
    case 'SET_CURSOR':
      return { ...state, cursor: action.cursor };
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        allFriends: action.data,
        isInitialLoad: false,
      };
    case 'APPEND_DATA': {
      // Avoid duplicates
      const existingIds = new Set(state.allFriends.map(f => f.id));
      const newFriends = action.data.filter(f => !existingIds.has(f.id));
      return {
        ...state,
        allFriends: [...state.allFriends, ...newFriends],
      };
    }
    default:
      return state;
  }
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
  
  const [state, dispatch] = useReducer(friendsReducer, {
    cursor: null,
    allFriends: [],
    isInitialLoad: true,
    currentSearch: searchQuery,
  });
  
  const prevSearchRef = useRef(searchQuery);
  
  // Reset when search query changes
  useEffect(() => {
    if (prevSearchRef.current !== searchQuery) {
      prevSearchRef.current = searchQuery;
      dispatch({ type: 'RESET', search: searchQuery });
    }
  }, [searchQuery]);
  
  // Query with current cursor and search
  const result = useQuery(
    api.friends.list,
    canQuery && state.cursor === null
      ? { limit: 50, search: state.currentSearch }
      : canQuery && state.cursor
        ? { limit: 50, cursor: state.cursor, search: state.currentSearch }
        : "skip"
  );
  
  const prevResultRef = useRef(result);
  
  // Handle data updates when result changes
  useEffect(() => {
    if (!result?.data || !canQuery) return;
    if (prevResultRef.current?.data === result.data) return;
    
    prevResultRef.current = result;
    const convertedData = result.data.map(convertUser).filter((f): f is User => f !== null);
    
    if (state.cursor === null) {
      // First page
      dispatch({ type: 'SET_INITIAL_DATA', data: convertedData });
    } else if (state.cursor !== undefined) {
      // Subsequent pages
      dispatch({ type: 'APPEND_DATA', data: convertedData });
    }
  }, [result, canQuery, state.cursor]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      dispatch({ type: 'SET_CURSOR', cursor: result.nextCursor });
    }
  };
  
  const reset = () => {
    dispatch({ type: 'RESET', search: searchQuery });
  };
  
  return {
    data: state.allFriends,
    isLoading: state.isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: state.cursor !== null && state.cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
  };
};

type RequestsState = {
  cursor: Id<"friends"> | null | undefined;
  allRequests: User[];
  isInitialLoad: boolean;
};

type RequestsAction =
  | { type: 'RESET' }
  | { type: 'SET_CURSOR'; cursor: Id<"friends"> }
  | { type: 'SET_INITIAL_DATA'; data: User[] }
  | { type: 'APPEND_DATA'; data: User[] };

function requestsReducer(state: RequestsState, action: RequestsAction): RequestsState {
  switch (action.type) {
    case 'RESET':
      return {
        cursor: null,
        allRequests: [],
        isInitialLoad: true,
      };
    case 'SET_CURSOR':
      return { ...state, cursor: action.cursor };
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        allRequests: action.data,
        isInitialLoad: false,
      };
    case 'APPEND_DATA': {
      // Avoid duplicates
      const existingIds = new Set(state.allRequests.map(r => r.id));
      const newRequests = action.data.filter(r => !existingIds.has(r.id));
      return {
        ...state,
        allRequests: [...state.allRequests, ...newRequests],
      };
    }
    default:
      return state;
  }
}

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
  
  const [state, dispatch] = useReducer(requestsReducer, {
    cursor: null,
    allRequests: [],
    isInitialLoad: true,
  });
  
  // Query with current cursor
  const result = useQuery(
    api.friends.getRequests,
    canQuery && state.cursor === null
      ? { limit: 20 }
      : canQuery && state.cursor
        ? { limit: 20, cursor: state.cursor }
        : "skip"
  );
  
  const prevResultRef = useRef(result);
  
  // Handle data updates when result changes
  useEffect(() => {
    if (!result?.data || !canQuery) return;
    if (prevResultRef.current?.data === result.data) return;
    
    prevResultRef.current = result;
    const convertedData = result.data.map(convertUser).filter((r): r is User => r !== null);
    
    if (state.cursor === null) {
      // First page
      dispatch({ type: 'SET_INITIAL_DATA', data: convertedData });
    } else if (state.cursor !== undefined) {
      // Subsequent pages
      dispatch({ type: 'APPEND_DATA', data: convertedData });
    }
  }, [result, canQuery, state.cursor]);
  
  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      dispatch({ type: 'SET_CURSOR', cursor: result.nextCursor });
    }
  };
  
  const reset = () => {
    dispatch({ type: 'RESET' });
  };
  
  return {
    data: state.allRequests,
    isLoading: state.isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: state.cursor !== null && state.cursor !== undefined && result === undefined,
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

type SentRequestsState = {
  cursor: Id<"friends"> | null | undefined;
  allSentRequests: User[];
  isInitialLoad: boolean;
};

type SentRequestsAction =
  | { type: 'RESET' }
  | { type: 'SET_CURSOR'; cursor: Id<"friends"> }
  | { type: 'SET_INITIAL_DATA'; data: User[] }
  | { type: 'APPEND_DATA'; data: User[] };

function sentRequestsReducer(state: SentRequestsState, action: SentRequestsAction): SentRequestsState {
  switch (action.type) {
    case 'RESET':
      return {
        cursor: null,
        allSentRequests: [],
        isInitialLoad: true,
      };
    case 'SET_CURSOR':
      return { ...state, cursor: action.cursor };
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        allSentRequests: action.data,
        isInitialLoad: false,
      };
    case 'APPEND_DATA': {
      // Avoid duplicates
      const existingIds = new Set(state.allSentRequests.map(r => r.id));
      const newRequests = action.data.filter(r => !existingIds.has(r.id));
      return {
        ...state,
        allSentRequests: [...state.allSentRequests, ...newRequests],
      };
    }
    default:
      return state;
  }
}

/**
 * Get pending friend requests sent by the current user with full user data
 */
export const useSentFriendRequests = () => {
  const { isGuest } = useAuthStore();
  const { isProfileReady } = useProfileStore();
  const { isAuthSet } = useConvexAuthStore();

  // Only query when fully authenticated AND profile is ready
  const canQuery = !isGuest && isAuthSet && isProfileReady;

  const [state, dispatch] = useReducer(sentRequestsReducer, {
    cursor: null,
    allSentRequests: [],
    isInitialLoad: true,
  });
  
  // Query with current cursor
  const result = useQuery(
    api.friends.getSentRequestsWithData,
    canQuery && state.cursor === null
      ? { limit: 20 }
      : canQuery && state.cursor
        ? { limit: 20, cursor: state.cursor }
        : "skip"
  );
  
  const prevResultRef = useRef(result);

  // Handle data updates when result changes
  useEffect(() => {
    if (!result?.data || !canQuery) return;
    if (prevResultRef.current?.data === result.data) return;
    
    prevResultRef.current = result;
    const convertedData = result.data.map(convertUser).filter((r): r is User => r !== null);
    
    if (state.cursor === null) {
      // First page
      dispatch({ type: 'SET_INITIAL_DATA', data: convertedData });
    } else if (state.cursor !== undefined) {
      // Subsequent pages
      dispatch({ type: 'APPEND_DATA', data: convertedData });
    }
  }, [result, canQuery, state.cursor]);

  const fetchNextPage = () => {
    if (result?.hasMore && result?.nextCursor) {
      dispatch({ type: 'SET_CURSOR', cursor: result.nextCursor });
    }
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  // Helper function to check if a request was sent to a specific user
  const hasPendingRequest = (userId: Id<"profiles"> | string) => {
    return state.allSentRequests.some(req => req.id === userId);
  };

  return {
    data: state.allSentRequests,
    isLoading: state.isInitialLoad && result === undefined && canQuery,
    hasNextPage: result?.hasMore || false,
    isFetchingNextPage: state.cursor !== null && state.cursor !== undefined && result === undefined,
    fetchNextPage,
    refetch: reset,
    error: null,
    hasPendingRequest,
  };
};
