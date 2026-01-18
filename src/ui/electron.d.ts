export interface ElectronAPI {
    spawnClient: (args?: string[]) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


