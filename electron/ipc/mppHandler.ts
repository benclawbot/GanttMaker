import { parseMPP } from '@tensor-estate/tsmpp';
import fs from 'fs/promises';
import type { ProjectData } from '@tensor-estate/tsmpp';

export async function readMpp(buffer: Buffer): Promise<ProjectData> {
  return parseMPP(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

export async function saveMpp(data: unknown, filePath: string): Promise<void> {
  // The renderer is responsible for serializing the project data to JSON.
  // For .gan files, this is plain JSON. We write the serialized string to disk.
  const content =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}
