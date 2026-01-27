const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Allow self-signed certificates for development
// WARNING: Remove this in production!
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        title: 'RAMP Controller',
        backgroundColor: '#1a1a2e'
    });

    mainWindow.loadFile('src/index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    return result.filePaths[0];
});

ipcMain.handle('save-file', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    return result.filePath;
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    return result.filePaths[0];
});

ipcMain.on('show-notification', (event, { title, body }) => {
    // Use Electron's Notification API
    const { Notification } = require('electron');

    const notification = new Notification({
        title,
        body,
        icon: path.join(__dirname, 'assets/icon.png')
    });

    notification.show();
});

console.log('[*] RAMP Controller starting...');
