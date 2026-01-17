import { useEffect } from "react";
import { useConvexAuth as useConvexAuthState } from "convex/react";
import { create } from "zustand";

// Track auth state globally - used by hooks to know when auth is ready
interface ConvexAuthState {
  isAuthSet: boolean;
  setIsAuthSet: (value: boolean) => void;
}

export const useConvexAuthStore = create<ConvexAuthState>((set) => ({
  isAuthSet: false,
  setIsAuthSet: (value) => set({ isAuthSet: value }),
}));

/**
 * Hook to sync auth state with Zustand store.
 * Auth token handling is done by ConvexBetterAuthProvider in main.tsx.
 * This hook just tracks whether user is authenticated for conditional queries.
 */
export function useConvexAuth() {
  const { setIsAuthSet } = useConvexAuthStore();
  const { isLoading, isAuthenticated } = useConvexAuthState();

  useEffect(() => {
    setIsAuthSet(!isLoading && isAuthenticated);
  }, [isLoading, isAuthenticated, setIsAuthSet]);
}
