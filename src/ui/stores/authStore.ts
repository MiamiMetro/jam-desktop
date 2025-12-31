import { create } from 'zustand';
import { authApi } from '@/lib/api/api';
import { setAuthToken } from '@/lib/api/client';
import type { User } from '@/lib/api/types';

interface AuthState {
  isGuest: boolean;
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerWithCredentials: (email: string, password: string, username: string, display_name?: string) => Promise<void>;
}

// Initialize state based on whether token exists in localStorage
const getInitialState = () => {
  const token = localStorage.getItem('auth_token');
  return {
    isGuest: !token, // If token exists, we're not a guest (optimistic)
    user: null,
    isLoading: !!token, // If token exists, we're loading to verify it
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),
  setUser: (user) => set({ user, isGuest: !user }),
  setIsGuest: (isGuest) => set({ isGuest, user: isGuest ? null : undefined }),
  login: (user) => set({ user, isGuest: false }),
  logout: () => {
    setAuthToken(null);
    set({ user: null, isGuest: true });
  },
  checkSession: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isGuest: true, user: null, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await authApi.getMe();
      set({ user, isGuest: false, isLoading: false });
    } catch (error: any) {
      // Only clear token if it's a 401 (unauthorized) - means token is invalid
      // For other errors (network, etc.), keep the token and let user retry
      if (error?.status === 401) {
        // Token invalid or expired
        setAuthToken(null);
        set({ user: null, isGuest: true, isLoading: false });
      } else {
        // Network error or other issue - keep token but mark as guest for now
        // User can retry by refreshing or the app can retry later
        set({ isGuest: true, user: null, isLoading: false });
      }
    }
  },
  loginWithCredentials: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const response = await authApi.login({ email, password });
      setAuthToken(response.access_token);
      // Always call getMe to ensure we have the complete user object
      const user = await authApi.getMe();
      set({ user, isGuest: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  registerWithCredentials: async (email: string, password: string, username: string, display_name?: string) => {
    try {
      set({ isLoading: true });
      const response = await authApi.register({ email, password, username, display_name });
      setAuthToken(response.access_token);
      // Always call getMe to ensure we have the complete user object
      const user = await authApi.getMe();
      set({ user, isGuest: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));

