import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/api/types';

interface AuthState {
  isGuest: boolean;
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerWithCredentials: (email: string, password: string, username: string, display_name?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isGuest: true,
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isGuest: !user }),
  setIsGuest: (isGuest) => set({ isGuest, user: isGuest ? null : undefined }),
  login: (user) => set({ user, isGuest: false }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isGuest: true });
  },
  checkSession: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ isGuest: true, user: null, isLoading: false });
        return;
      }

      // Get user metadata from Supabase session
      const supabaseUser = session.user;
      const user: User = {
        id: supabaseUser.id,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
        display_name: supabaseUser.user_metadata?.display_name,
        avatar: supabaseUser.user_metadata?.avatar_url,
        bio: supabaseUser.user_metadata?.bio,
      };
      
      set({ user, isGuest: false, isLoading: false });
    } catch (error) {
      console.error('Session check failed:', error);
      set({ isGuest: true, user: null, isLoading: false });
    }
  },
  loginWithCredentials: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        set({ isLoading: false });
        throw { message: error.message, status: 401 };
      }

      const supabaseUser = data.user;
      const user: User = {
        id: supabaseUser.id,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
        display_name: supabaseUser.user_metadata?.display_name,
        avatar: supabaseUser.user_metadata?.avatar_url,
        bio: supabaseUser.user_metadata?.bio,
      };
      
      set({ user, isGuest: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  registerWithCredentials: async (email: string, password: string, username: string, display_name?: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name,
          },
        },
      });
      
      if (error) {
        set({ isLoading: false });
        throw { message: error.message, status: 400 };
      }

      if (!data.user) {
        set({ isLoading: false });
        throw { message: 'Registration failed', status: 400 };
      }

      const supabaseUser = data.user;
      const user: User = {
        id: supabaseUser.id,
        username: supabaseUser.user_metadata?.username || username,
        display_name: supabaseUser.user_metadata?.display_name || display_name,
        avatar: supabaseUser.user_metadata?.avatar_url,
        bio: supabaseUser.user_metadata?.bio,
      };
      
      set({ user, isGuest: false, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
