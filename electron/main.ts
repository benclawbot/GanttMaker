import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  ipcMain,
  shell,
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { openFileDialog, saveFileDialog } from './ipc/fileDialogs';
import { readMpp, saveMpp } from './ipc/mppHandler';

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(VITE_DEV_SERVER_URL);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'GanttMaker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as'),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo',
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          role: 'reload',
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom',
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          role: 'zoomIn',
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut',
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          role: 'togglefullscreen',
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => shell.openExternal('https://github.com'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

function setupIpcHandlers() {
  ipcMain.handle('open-file-dialog', async () => {
    return openFileDialog(mainWindow);
  });

  ipcMain.handle('save-file-dialog', async (_event, data: string, format: 'gan' | 'mpp', defaultName: string) => {
    return saveFileDialog(data, format, defaultName, mainWindow);
  });

  ipcMain.handle('read-mpp', async (_event, filePath: string) => {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return readMpp(buffer);
  });

  ipcMain.handle('save-mpp', async (_event, data: unknown, filePath: string) => {
    return saveMpp(data, filePath);
  });

  ipcMain.handle('read-gan', async (_event, filePath: string) => {
    const fs = await import('fs/promises');
    return fs.readFile(filePath, 'utf-8');
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Find .gan or .mpp path from command line arguments
    const filePath = commandLine.find(
      (arg) => arg.endsWith('.gan') || arg.endsWith('.mpp'),
    );
    if (filePath && mainWindow) {
      mainWindow.webContents.send('open-file', filePath);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
