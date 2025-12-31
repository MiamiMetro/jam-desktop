import { create } from 'zustand';

export type User = {
  id: string;
  username: string;
  avatar?: string;
  level?: number;
  status?: string;
  statusMessage?: string;
};

interface AuthState {
  isGuest: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isGuest: true,
  user: null,
  setUser: (user) => set({ user, isGuest: !user }),
  setIsGuest: (isGuest) => set({ isGuest, user: isGuest ? null : undefined }),
  login: (user) => set({ user, isGuest: false }),
  logout: () => set({ user: null, isGuest: true }),
}));

