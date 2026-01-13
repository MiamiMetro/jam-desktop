import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    spawnClient: (args?: string[]) => ipcRenderer.invoke('spawn-client', args || []),
    
    // Secure token storage using OS keychain (via keytar)
    secureStorage: {
        setToken: (account: string, token: string) => 
            ipcRenderer.invoke('keytar-set', account, token),
        getToken: (account: string) => 
            ipcRenderer.invoke('keytar-get', account),
        deleteToken: (account: string) => 
            ipcRenderer.invoke('keytar-delete', account),
    },
});


