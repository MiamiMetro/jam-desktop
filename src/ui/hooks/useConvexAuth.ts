import { useEffect } from "react";
import { supabase } from "../lib/supabase";
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
 * Auth token handling is done by ConvexProviderWithAuth in main.tsx.
 * This hook just tracks whether user is authenticated for conditional queries.
 */
export function useConvexAuth() {
  const { setIsAuthSet } = useConvexAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthSet(!!session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthSet(!!session);
    });

    return () => subscription.unsubscribe();
  }, [setIsAuthSet]);
}
