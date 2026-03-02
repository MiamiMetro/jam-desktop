import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform as 'darwin' | 'win32' | 'linux',
    spawnClient: (args?: string[]) => ipcRenderer.invoke('spawn-client', args || []),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    onNavigate: (callback: (path: string) => void) => {
        ipcRenderer.removeAllListeners('navigate');
        ipcRenderer.on('navigate', (_event, path) => callback(path));
    },
    onToggleTheme: (callback: () => void) => {
        ipcRenderer.removeAllListeners('toggle-theme');
        ipcRenderer.on('toggle-theme', () => callback());
    },
    saveTheme: (theme: 'dark' | 'light') => {
        ipcRenderer.invoke('save-theme', theme);
    },
    updateTitleBarOverlay: (theme: 'dark' | 'light') => {
        ipcRenderer.invoke('update-title-bar-overlay', theme);
    },
    setPresenceSessionState: (state: { sessionToken: string | null; convexUrl?: string | null }) => {
        ipcRenderer.send('presence-session-state', state);
    },
});


