// authModalStore.ts — Controls auth modal visibility and mode
import { create } from 'zustand';

type AuthModalMode = 'login' | 'signup' | 'username-setup';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  openLogin: () => void;
  openSignup: () => void;
  openUsernameSetup: () => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  openLogin: () => set({ isOpen: true, mode: 'login' }),
  openSignup: () => set({ isOpen: true, mode: 'signup' }),
  openUsernameSetup: () => set({ isOpen: true, mode: 'username-setup' }),
  close: () => set({ isOpen: false }),
}));
