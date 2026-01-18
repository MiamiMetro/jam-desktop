export interface ElectronAPI {
    spawnClient: (args?: string[]) => Promise<{ success: boolean; error?: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    onNavigate: (callback: (path: string) => void) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


