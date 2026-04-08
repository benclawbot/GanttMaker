import { dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export async function openFileDialog(parentWindow: BrowserWindow | null) {
  const result = await dialog.showOpenDialog(parentWindow ?? undefined, {
    title: 'Open Project',
    filters: [
      { name: 'GanttMaker Projects', extensions: ['gan'] },
      { name: 'Microsoft Project', extensions: ['mpp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.mpp') {
    const buffer = await fs.readFile(filePath);
    return { type: 'mpp' as const, filePath, buffer };
  } else {
    const content = await fs.readFile(filePath, 'utf-8');
    return { type: 'gan' as const, filePath, content };
  }
}

export async function saveFileDialog(
  data: string,
  format: 'gan' | 'mpp',
  defaultName: string,
  parentWindow: BrowserWindow | null,
): Promise<string | null> {
  const filters =
    format === 'gan'
      ? [{ name: 'GanttMaker Projects', extensions: ['gan'] }]
      : [{ name: 'Microsoft Project', extensions: ['mpp'] }];

  const result = await dialog.showSaveDialog(parentWindow ?? undefined, {
    title: 'Save Project',
    defaultPath: defaultName,
    filters,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = result.filePath!;
  try {
    if (format === 'gan') {
      await fs.writeFile(filePath, data as string, 'utf-8');
    } else {
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  } catch {
    throw new Error(`Failed to write file: ${filePath}`);
  }
  return filePath;
}
