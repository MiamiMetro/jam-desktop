import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { isDev } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Theme background colors (read at startup to prevent native window flash)
const THEME_BG = { dark: '#05070D', light: '#f5f0e8' } as const;

function getSavedTheme(): 'dark' | 'light' {
    try {
        const data = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'theme.json'), 'utf-8'));
        return data.theme === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
}

// Track the spawned client process
let clientProcess: ChildProcess | null = null;

/**
 * Handle deep links (e.g., jam://profile/123 or https://yourapp.com/#/profile/123)
 * Converts protocol URLs to internal navigation paths
 */
function handleDeepLink(window: BrowserWindow, url: string) {
    try {
        const parsedUrl = new URL(url);
        let path = '';

        if (parsedUrl.protocol === 'jam:') {
            // Custom protocol: jam://profile/123 → /profile/123
            // Combine hostname and pathname with leading slash
            const hostname = parsedUrl.hostname || '';
            const pathname = parsedUrl.pathname || '';
            path = '/' + hostname + pathname;
        } else if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            // HTTP/HTTPS with HashRouter: https://yourapp.com/#/profile/123 → /profile/123
            if (parsedUrl.hash) {
                // Remove the leading '#' from hash
                path = parsedUrl.hash.substring(1);
            } else {
                // Fallback to pathname if no hash
                path = parsedUrl.pathname === '/' ? '/feed' : parsedUrl.pathname;
            }
        }

        if (path && path !== '/') {
            // Send navigation command to renderer process
            window.webContents.send('navigate', path);
            console.log('[Deep Link] Navigating to:', path);
        }
    } catch (error) {
        console.error('[Deep Link] Failed to parse URL:', url, error);
    }
}

// Protocol handler for deep links (e.g., jam://profile/123)
// This allows "Open in App" functionality
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('jam', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('jam');
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Another instance is already running, exit this one
    app.quit();
} else {
    // Handle second instance attempts - focus the existing window and handle deep links
    app.on('second-instance', (_event, commandLine) => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const mainWindow = windows[0];
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Handle deep link from second instance (Windows/Linux)
            const url = commandLine.find(arg => arg.startsWith('jam://'));
            if (url) {
                handleDeepLink(mainWindow, url);
            }
        }
    });

    let mainWindow: BrowserWindow | null = null;

    // IPC handler for opening external links
    ipcMain.handle('open-external', async (_event, url: string) => {
        try {
            const parsedUrl = new URL(url);

            // Only allow HTTP/HTTPS links
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                await shell.openExternal(url);
                return { success: true };
            } else {
                return { success: false, error: 'Only HTTP/HTTPS URLs are allowed' };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Invalid URL'
            };
        }
    });

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

    // Save theme preference so next launch uses correct background color
    ipcMain.handle('save-theme', (_event, theme: 'dark' | 'light') => {
        try {
            writeFileSync(path.join(app.getPath('userData'), 'theme.json'), JSON.stringify({ theme }));
        } catch { /* non-critical */ }
    });

    app.on('ready', () => {
        const preloadPath = isDev()
            ? path.join(process.cwd(), 'dist-electron', 'preload.js')
            : path.join(__dirname, 'preload.js');

        // Configure Content Security Policy
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // React needs unsafe-eval in dev
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: https:; " + // Allow images from HTTPS sources
                        "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.r2.cloudflarestorage.com https://media.welor.fun http://localhost:* ws://localhost:*; " + // Convex + R2 uploads + media CDN + dev server
                        "media-src 'self' https: http: blob:; " + // Allow HLS video streams
                        "font-src 'self' data:; " +
                        "object-src 'none'; " + // Block plugins
                        "base-uri 'self'; " + // Prevent base tag hijacking
                        "form-action 'self'; " + // Only submit forms to same origin
                        "frame-ancestors 'none';" // Prevent clickjacking
                    ]
                }
            });
        });

        mainWindow = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 384,
            minHeight: 216,
            show: false, // Don't show until ready
            backgroundColor: THEME_BG[getSavedTheme()],
            autoHideMenuBar: process.platform !== 'darwin', // Hide menu on Windows/Linux, keep on macOS
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                // Ensure auth cookies persist across app restarts
                partition: 'persist:jam-desktop',
                webSecurity: true, // Enable web security
                allowRunningInsecureContent: false, // Block mixed content
            },
        });

        // Security: Lock down navigation - prevent navigating to external sites
        mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);

            // In dev, allow localhost. In production, only allow file protocol
            const allowedHosts = isDev() ? ['localhost', '127.0.0.1'] : [];
            const allowedProtocols = ['file:', 'devtools:'];

            if (!allowedHosts.includes(parsedUrl.hostname) && !allowedProtocols.includes(parsedUrl.protocol)) {
                event.preventDefault();
                console.warn('[Security] Navigation blocked:', navigationUrl);
            }
        });

        // Security: Handle external links - open in default browser instead of new window
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            // Parse URL to validate it
            try {
                const parsedUrl = new URL(url);

                // Only allow HTTP/HTTPS links to open externally
                if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                    // Open in user's default browser (secure)
                    shell.openExternal(url);
                    console.log('[Security] Opened external link in browser:', url);
                } else {
                    console.warn('[Security] Blocked non-HTTP link:', url);
                }
            } catch {
                console.warn('[Security] Invalid URL blocked:', url);
            }

            // Always deny opening in new Electron window
            return { action: 'deny' };
        });

        // Security: Disable remote content injection
        mainWindow.webContents.on('will-attach-webview', (event) => {
            event.preventDefault();
            console.warn('[Security] Webview attachment blocked');
        });

        // Custom application menu
        const isMac = process.platform === 'darwin';
        const menuTemplate: Electron.MenuItemConstructorOptions[] = [
            // macOS app menu (required — uses app name automatically)
            ...(isMac ? [{
                role: 'appMenu' as const,
            }] : []),
            // File
            {
                label: 'File',
                submenu: [
                    isMac ? { role: 'close' as const } : { role: 'quit' as const },
                ],
            },
            // Edit — keep for text input support (copy/paste/undo)
            { role: 'editMenu' as const },
            // View
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Theme',
                        accelerator: isMac ? 'Cmd+T' : 'Ctrl+T',
                        click: () => mainWindow?.webContents.send('toggle-theme'),
                    },
                    { type: 'separator' },
                    { role: 'reload' as const },
                    { role: 'forceReload' as const },
                    ...(isDev() ? [{ role: 'toggleDevTools' as const }] : []),
                    { type: 'separator' as const },
                    { role: 'resetZoom' as const },
                    { role: 'zoomIn' as const },
                    { role: 'zoomOut' as const },
                    { type: 'separator' as const },
                    { role: 'togglefullscreen' as const },
                ],
            },
            // Navigate
            {
                label: 'Navigate',
                submenu: [
                    {
                        label: 'Jams',
                        accelerator: isMac ? 'Cmd+1' : 'Ctrl+1',
                        click: () => mainWindow?.webContents.send('navigate', '/jams'),
                    },
                    {
                        label: 'Feed',
                        accelerator: isMac ? 'Cmd+2' : 'Ctrl+2',
                        click: () => mainWindow?.webContents.send('navigate', '/feed'),
                    },
                    {
                        label: 'Friends',
                        accelerator: isMac ? 'Cmd+3' : 'Ctrl+3',
                        click: () => mainWindow?.webContents.send('navigate', '/friends'),
                    },
                    {
                        label: 'Communities',
                        accelerator: isMac ? 'Cmd+4' : 'Ctrl+4',
                        click: () => mainWindow?.webContents.send('navigate', '/communities'),
                    },
                ],
            },
            // Window
            {
                role: 'windowMenu' as const,
            },
        ];

        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);

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

    // Handle deep links on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && windows[0]) {
            handleDeepLink(windows[0], url);
            if (windows[0].isMinimized()) windows[0].restore();
            windows[0].focus();
        }
    });
}
