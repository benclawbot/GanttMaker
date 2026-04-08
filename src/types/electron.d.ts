// src/types/electron.d.ts

export interface ElectronAPI {
  openFileDialog: () => Promise<{
    type: 'gan';
    filePath: string;
    content: string;
  } | {
    type: 'mpp';
    filePath: string;
    buffer: Buffer;
  } | null>;

  saveFileDialog: (data: string, format: 'gan' | 'mpp', defaultName: string) => Promise<string | null>;
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};