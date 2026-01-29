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
        icon: path.join(__dirname, 'assets/app_icon.ico'),
        title: 'RAMP Controller',
        backgroundColor: '#1a1a2e'
    });

    // Load the index.html
    mainWindow.loadFile('src/index.html');

    // Open DevTools for debugging
    // mainWindow.webContents.openDevTools();

    // Handle window close
    mainWindow.on('closed', () => {
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
        icon: path.join(__dirname, 'assets/app_icon.ico')
    });

    notification.show();
});

ipcMain.on('show-context-menu', (event) => {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();

    menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
    menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
    menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
    // menu.append(new MenuItem({ type: 'separator' }));
    // menu.append(new MenuItem({ label: 'Select All', role: 'selectall' }));

    menu.popup({ window: mainWindow });
});

console.log('[*] RAMP Controller starting...');
