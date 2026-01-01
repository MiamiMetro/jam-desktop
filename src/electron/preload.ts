import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    spawnClient: (args?: string[]) => ipcRenderer.invoke('spawn-client', args || []),
});


