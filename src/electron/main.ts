import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { isDev } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track the spawned client process
let clientProcess: ChildProcess | null = null;

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

    // IPC handler for spawning client executable
    ipcMain.handle('spawn-client', async (_event, args: string[] = []) => {
        try {
            // Check if client is already running
            if (clientProcess) {
                // Check if the process is still alive
                try {
                    // On Windows, killed processes throw an error when checking exitCode
                    if (clientProcess.exitCode === null && clientProcess.pid) {
                        // Process is still running
                        return { success: false, error: 'Client is already running' };
                    }
                } catch {
                    // Process might have been killed, continue to spawn new one
                    clientProcess = null;
                }
            }

            // Determine the executable name based on platform
            const platform = process.platform;
            const clientExecutable = platform === 'win32' ? 'client.exe' : 'client';

            let clientPath: string;
            
            if (isDev()) {
                // In development, look for client executable in resources/client relative to project root
                clientPath = path.join(process.cwd(), 'resources', 'client', clientExecutable);
            } else {
                // In production, extraResources are placed in process.resourcesPath
                // Try the expected path first
                clientPath = path.join(process.resourcesPath, 'client', clientExecutable);
                
                // If not found, try alternative path (in case electron-builder nests it)
                if (!existsSync(clientPath)) {
                    const altPath = path.join(process.resourcesPath, 'resources', 'client', clientExecutable);
                    if (existsSync(altPath)) {
                        clientPath = altPath;
                    }
                }
            }

            // Check if file exists
            if (!existsSync(clientPath)) {
                return { success: false, error: `Client executable not found at ${clientPath}` };
            }

            // Spawn the client executable with provided arguments
            clientProcess = spawn(clientPath, args, {
                detached: true,
                stdio: 'ignore',
            });

            // Handle process exit to clear the reference
            clientProcess.on('exit', () => {
                clientProcess = null;
            });

            clientProcess.on('error', () => {
                clientProcess = null;
            });

            clientProcess.unref();

            return { success: true };
        } catch (error) {
            clientProcess = null;
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    });

    app.on('ready', () => {
        const preloadPath = isDev() 
            ? path.join(process.cwd(), 'dist-electron', 'preload.js')
            : path.join(__dirname, 'preload.js');

        mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 384,
            minHeight: 216,
            show: false, // Don't show until ready
            backgroundColor: '#ffffff', // Match your app background
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                // Ensure auth cookies persist across app restarts
                partition: 'persist:jam-desktop',
            },
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