import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
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
  rightPanelOpen: (() => {
    const stored = localStorage.getItem('rightPanelOpen');
    return stored !== null ? stored === 'true' : true;
  })(),
  setRightPanelOpen: (open) => {
    localStorage.setItem('rightPanelOpen', String(open));
    set({ rightPanelOpen: open });
  },
  toggleRightPanel: () => {
    set((state) => {
      const next = !state.rightPanelOpen;
      localStorage.setItem('rightPanelOpen', String(next));
      return { rightPanelOpen: next };
    });
  },
}));

