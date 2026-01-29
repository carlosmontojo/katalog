const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;

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
    // Configure session to allow webview to work properly
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                // Remove X-Frame-Options to allow embedding in webview if needed
                'X-Frame-Options': undefined,
            }
        });
    });
    
    await startNextServer();
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
