/**
 * File Handler Module
 * 
 * Handles import and export of project files, with primary support for
 * the .gan (GanttProject) format and extensibility for other formats.
 * 
 * @example
 * // Import a .gan file
 * import { importGanFile } from './file-handler';
 * const projectData = await importGanFile(file);
 * 
 * @example
 * // Export to .gan file
 * import { exportGanFile } from './file-handler';
 * const blob = await exportGanFile(projectData);
 */

export { parseGanFile, validateGanFile } from './parsers';
export { parseGanString } from './parsers/ganParser';
import { serializeGanFile } from './serializers';
import type { ProjectData } from './types';

export type { ProjectData, Task, Link, Resource, Assignment, ValidationResult } from './types';

/**
 * Import a .gan (GanttProject) file
 */
export async function importGanFile(file: File): Promise<ProjectData> {
  return parseGanFile(file);
}

/**
 * Export project data to .gan (GanttProject) format
 */
export function exportGanFile(projectData: ProjectData): Blob {
  return serializeGanFile(projectData);
}

/**
 * Validate a .gan file without fully parsing it
 */
export async function validateGanFileStructure(file: File): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  return validateGanFile(file);
}

/**
 * Download a project as a .gan file
 */
export function downloadGanFile(projectData: ProjectData, filename: string = 'project.gan'): void {
  const blob = exportGanFile(projectData);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}