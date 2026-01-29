const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Flag to detect we're running in Electron
    isElectron: true,

    // Platform info
    platform: process.platform,

    // IPC methods for future use
    send: (channel, data) => {
        const validChannels = ['capture-product', 'save-file'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['product-captured', 'file-saved'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});

console.log('[Preload] Electron APIs exposed to renderer');
