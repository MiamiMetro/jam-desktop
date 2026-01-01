export interface ElectronAPI {
    spawnClient: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


