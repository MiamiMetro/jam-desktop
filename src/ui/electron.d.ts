export interface SecureStorageAPI {
    setToken: (account: string, token: string) => Promise<{ success: boolean; error?: string }>;
    getToken: (account: string) => Promise<{ success: boolean; token?: string | null; error?: string }>;
    deleteToken: (account: string) => Promise<{ success: boolean; deleted?: boolean; error?: string }>;
}

export interface ElectronAPI {
    spawnClient: (args?: string[]) => Promise<{ success: boolean; error?: string }>;
    secureStorage: SecureStorageAPI;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}


