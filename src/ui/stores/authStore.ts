import { create } from 'zustand';
import { authClient } from '@/lib/auth-client';
import type { User } from '@/lib/api/types';
import { useConvexAuthStore } from '@/hooks/useConvexAuth';
import { useProfileStore } from '@/hooks/useEnsureProfile';

interface AuthState {
  isGuest: boolean;
  user: User | null;
  isLoading: boolean;
  pendingProfile: { username: string; displayName?: string } | null;
  setUser: (user: User | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setPendingProfile: (profile: { username: string; displayName?: string } | null) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerWithCredentials: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isGuest: true,
  user: null,
  isLoading: true,
  pendingProfile: null,
  setUser: (user) => set({ user, isGuest: !user }),
  setIsGuest: (isGuest) =>
    set({ isGuest, user: null }),
  setPendingProfile: (profile) => set({ pendingProfile: profile }),
  login: (user) => set({ user, isGuest: false }),
  logout: async () => {
    await authClient.signOut();
    useConvexAuthStore.getState().setIsAuthSet(false);
    useProfileStore.getState().setProfileReady(false);
    set({ user: null, isGuest: true, pendingProfile: null });
  },
  checkSession: async () => {
    try {
      set({ isLoading: true });
      const result = await authClient.getSession();
      const session = result.data;

      if (!session) {
        useConvexAuthStore.getState().setIsAuthSet(false);
        useProfileStore.getState().setProfileReady(false);
        set({ isGuest: true, user: null, isLoading: false });
        return;
      }

      const user = (session as any).user as User | null | undefined;
      set({ user: user ?? null, isGuest: false, isLoading: false, pendingProfile: null });
    } catch (error) {
      console.error('Session check failed:', error);
      set({ isGuest: true, user: null, isLoading: false });
    }
  },
  loginWithCredentials: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        set({ isLoading: false });
        // Extract the actual error message from better-auth response
        const errorMessage = result.error.message || 'Login failed';
        throw new Error(errorMessage);
      }

      // After successful login, fetch the session to get user data
      await useAuthStore.getState().checkSession();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  registerWithCredentials: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      // Create auth account without username (profile creation happens after)
      const result = await authClient.signUp.email({
        email,
        password,
        name: email, // Use email as placeholder name
      });

      if (result.error) {
        set({ isLoading: false });
        // Extract the actual error message from better-auth response
        const errorMessage = result.error.message || 'Registration failed';
        throw new Error(errorMessage);
      }

      set({
        isGuest: false,
        isLoading: false,
      });

      // After successful registration, fetch the session to get user data
      await useAuthStore.getState().checkSession();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
