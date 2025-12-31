import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: (() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'system';
  })(),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
}));

