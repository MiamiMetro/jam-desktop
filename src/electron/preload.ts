import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    spawnClient: () => ipcRenderer.invoke('spawn-client'),
});


