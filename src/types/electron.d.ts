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

// File System Access API (used when app is installed as PWA)
export interface FileSystemWritableFileOptions {
  type?: 'write' | 'writetruncate' | 'append';
  data?: Blob | BufferSource | string;
  size?: number;
}

export interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

export interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

export interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: FilePickerAcceptType[];
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  }

  interface FileSystemFileHandle {
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileWriter>;
  }

  interface FileSystemWritableFileWriter {
    write(data: Blob | BufferSource | string): Promise<void>;
    close(): Promise<void>;
  }
}

export {};
