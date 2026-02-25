export interface ElectronAPI {
    spawnClient: (args?: string[]) => Promise<{ success: boolean; error?: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    onNavigate: (callback: (path: string) => void) => void;
    onToggleTheme: (callback: () => void) => void;
    saveTheme: (theme: 'dark' | 'light') => void;
    setPresenceSessionState: (state: { sessionToken: string | null; convexUrl?: string | null }) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


