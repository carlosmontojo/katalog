const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;
let appSession;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            partition: 'persist:katalog', // Persist cookies/localStorage across app restarts
            webviewTag: true, // Enable <webview> tag
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load the Next.js app
    const startUrl = `http://localhost:${PORT}`;

    mainWindow.loadURL(startUrl);

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startNextServer() {
    return new Promise((resolve, reject) => {
        // In production, Next.js would be built and served differently
        // For dev, we assume `npm run dev` is already running
        if (isDev) {
            console.log('[Electron] Development mode - expecting Next.js server on port 3000');
            resolve();
            return;
        }

        // Production: Start the Next.js server
        nextServer = spawn('npm', ['run', 'start'], {
            cwd: path.join(__dirname, '..'),
            shell: true,
            stdio: 'inherit'
        });

        // Wait a bit for server to start
        setTimeout(resolve, 3000);
    });
}

app.whenReady().then(async () => {
    // Get the persistent session (matches the partition in webPreferences)
    appSession = session.fromPartition('persist:katalog');

    // Only remove X-Frame-Options for webview URLs, not for our own app
    // This prevents interfering with Set-Cookie headers from our Next.js server
    appSession.webRequest.onHeadersReceived((details, callback) => {
        // Only strip X-Frame-Options for external URLs loaded in webviews
        if (details.resourceType === 'subFrame' || details.url.indexOf('localhost') === -1) {
            const headers = { ...details.responseHeaders };
            delete headers['x-frame-options'];
            delete headers['X-Frame-Options'];
            callback({ responseHeaders: headers });
        } else {
            // For our own app, pass through all headers unchanged
            callback({ cancel: false });
        }
    });

    await startNextServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Flush session data to disk before quitting
app.on('before-quit', () => {
    if (appSession) {
        appSession.flushStorageData();
    }
});

app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
