import { app, BrowserWindow } from 'electron';
import path from 'path';
import { isDev } from './util.js';

app.on('ready', () => {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 384,
        minHeight: 216,
        show: false, // Don't show until ready
        backgroundColor: '#ffffff', // Match your app background
    });

    // Show window when ready to prevent white screen flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123');
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'));
    }
});