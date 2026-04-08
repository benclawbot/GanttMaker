import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type FileDialogResult =
  | { type: 'mpp'; filePath: string; buffer: Buffer }
  | { type: 'gan'; filePath: string; content: string }
  | null;

export interface ElectronAPI {
  openFileDialog: () => Promise<FileDialogResult>;
  saveFileDialog: (data: unknown, format: 'gan' | 'mpp', defaultName: string) => Promise<string | null>;
  readMpp: (filePath: string) => Promise<unknown>;
  saveMpp: (data: unknown, filePath: string) => Promise<void>;
  readGan: (filePath: string) => Promise<string>;
  onMenuNew: (callback: () => void) => () => void;
  onMenuOpen: (callback: () => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
  onMenuSaveAs: (callback: () => void) => () => void;
  onMenuUndo: (callback: () => void) => () => void;
  onMenuRedo: (callback: () => void) => () => void;
  onFileOpened: (callback: (path: string) => void) => () => void;
}

const api: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  saveFileDialog: (data, format, defaultName) =>
    ipcRenderer.invoke('save-file-dialog', data, format, defaultName),

  readMpp: (filePath) => ipcRenderer.invoke('read-mpp', filePath),

  saveMpp: (data, filePath) => ipcRenderer.invoke('save-mpp', data, filePath),

  readGan: (filePath) => ipcRenderer.invoke('read-gan', filePath),

  onMenuNew: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-new', handler);
    return () => ipcRenderer.removeListener('menu-new', handler);
  },

  onMenuOpen: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-open', handler);
    return () => ipcRenderer.removeListener('menu-open', handler);
  },

  onMenuSave: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-save', handler);
    return () => ipcRenderer.removeListener('menu-save', handler);
  },

  onMenuSaveAs: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-save-as', handler);
    return () => ipcRenderer.removeListener('menu-save-as', handler);
  },

  onMenuUndo: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-undo', handler);
    return () => ipcRenderer.removeListener('menu-undo', handler);
  },

  onMenuRedo: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu-redo', handler);
    return () => ipcRenderer.removeListener('menu-redo', handler);
  },

  onFileOpened: (callback) => {
    const handler = (_event: IpcRendererEvent, path: string) => callback(path);
    ipcRenderer.on('open-file', handler);
    return () => ipcRenderer.removeListener('open-file', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
