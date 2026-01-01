import { app, BrowserWindow } from 'electron';
import path from 'path';
import { isDev } from './util.js';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running, exit this one
    app.quit();
} else {
    // Handle second instance attempts - focus the existing window
    app.on('second-instance', () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow: BrowserWindow | null = null;

    app.on('ready', () => {
        mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 384,
            minHeight: 216,
            show: false, // Don't show until ready
            backgroundColor: '#ffffff', // Match your app background
        });

        // Show window when ready to prevent white screen flash
        mainWindow.once('ready-to-show', () => {
            mainWindow?.show();
        });

        if (isDev()) {
            mainWindow.loadURL('http://localhost:5123');
        } else {
            mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'));
        }
    });
}