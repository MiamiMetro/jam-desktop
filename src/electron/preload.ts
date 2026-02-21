import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
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
});


