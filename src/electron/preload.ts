import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    spawnClient: (args?: string[]) => ipcRenderer.invoke('spawn-client', args || []),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    onNavigate: (callback: (path: string) => void) => {
        ipcRenderer.on('navigate', (_event, path) => callback(path));
    },
});


