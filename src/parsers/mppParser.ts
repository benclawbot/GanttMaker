/**
 * Microsoft Project .mpp File Parser
 * 
 * .mpp is a proprietary binary format. Since we can't natively parse it in the browser,
 * we use a multi-strategy approach:
 * 
 * 1. Try to parse as XML (MS Project 2013+ can save as XML-based MSPDI format with .mpp extension)
 * 2. Try to detect OLE2 Compound Document format and extract embedded XML
 * 3. Fall back to providing a helpful error with suggested workarounds
 * 
 * For proper .mpp binary support, this parser handles:
 * - MSPDI XML format (wrapped in .mpp)
 * - Microsoft Project XML export format (.xml)
 * - Basic OLE2 structure detection
 */

import type { Project, Task, Dependency, Resource, Assignment } from '../types';
import { TaskType, DependencyType, ConstraintType } from '../types';
import { generateId, defaultSettings } from '../store/projectStore';
import { addDays, parseISO } from 'date-fns';

interface ImportResult {
  project: Project;
  warnings: string[];
}

/**
 * Main .mpp parser entry point
 */
export async function parseMppFile(file: File): Promise<ImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];

  // Strategy 1: Try UTF-8 text parsing (some .mpp files are actually XML)
  try {
    const text = new TextDecoder('utf-8').decode(arrayBuffer);
    if (text.includes('<?xml') || text.includes('<Project')) {
      return parseMspdiXml(text, file.name, warnings);
    }
  } catch {
    // Not text-based
  }

  // Strategy 2: Scan for XML content in the binary blob (OLE2 container may have embedded XML)
  const xmlContent = extractXmlFromBinary(arrayBuffer);
  if (xmlContent) {
    warnings.push('Extracted XML from binary .mpp file. Some data may not be fully parsed.');
    try {
      return parseMspdiXml(xmlContent, file.name, warnings);
    } catch {
      // XML extraction failed too
    }
  }

  // Strategy 3: Try to parse as OLE2 Compound Document
  if (isOle2Format(arrayBuffer)) {
    warnings.push(
      'This is a binary .mpp file (OLE2 format). Full binary parsing is limited in the browser. ' +
      'For best results, open in Microsoft Project and save as "XML" format, then import here.'
    );
    // Return an empty project with the filename as name
    const project = createEmptyProjectFromFilename(file.name);
    project.fileType = 'mpp';
    return { project, warnings };
  }

  throw new Error(
    'Could not parse .mpp file. This file may be in an unsupported binary format. ' +
    'Please try saving as XML from Microsoft Project or GanttProject and importing again.'
  );
}

/**
 * Parse Microsoft Project XML (MSPDI) format
 * This handles both .xml files and XML-based .mpp files
 */
export function parseMspdiXml(xml: string, filename: string, warnings: string[] = []): ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent?.substring(0, 200)}`);
  }

  // NS-aware query helper
  const ns = 'http://schemas.microsoft.com/project';
  const q = (el: Element | Document, tag: string): Element | null => {
    return el.querySelector(tag) || el.getElementsByTagNameNS(ns, tag)[0] || null;
  };
  const qAll = (el: Element | Document, tag: string): Element[] => {
    const result = Array.from(el.querySelectorAll(tag));
    if (result.length > 0) return result;
    return Array.from(el.getElementsByTagNameNS(ns, tag));
  };

  // Project metadata
  const projectEl = q(doc, 'Project') || doc.documentElement;
  const projectName = q(projectEl, 'Name')?.textContent || filename.replace(/\.mpp$/i, '');
  const startDateStr = q(projectEl, 'StartDate')?.textContent || '';
  const projectStart = parseMspdiDate(startDateStr) || new Date();
  const company = q(projectEl, 'Company')?.textContent || undefined;
  const currency = q(projectEl, 'CurrencySymbol')?.textContent || undefined;
  const author = q(projectEl, 'Author')?.textContent || undefined;

  // Parse tasks
  const tasks: Task[] = [];
  const taskEls = qAll(doc, 'Task');

  taskEls.forEach((taskEl) => {
    const uid = q(taskEl, 'UID')?.textContent || '';
    if (!uid || uid === '0') return; // Skip project summary (UID=0)

    const id = q(taskEl, 'ID')?.textContent || uid;
    const name = q(taskEl, 'Name')?.textContent || 'Unnamed Task';
    const outline = q(taskEl, 'OutlineLevel')?.textContent || '0';
    const level = parseInt(outline) - 1; // MSPDI OutlineLevel starts at 1
    const summary = q(taskEl, 'Summary')?.textContent === '1';
    const milestone = q(taskEl, 'Milestone')?.textContent === '1';
    const startStr = q(taskEl, 'Start')?.textContent || '';
    const finishStr = q(taskEl, 'Finish')?.textContent || '';
    const durationStr = q(taskEl, 'Duration')?.textContent || 'PT0S';
    const pctComplete = parseInt(q(taskEl, 'PercentComplete')?.textContent || '0');
    const priority = parseMspdiPriority(q(taskEl, 'Priority')?.textContent || '500');
    const notes = q(taskEl, 'Notes')?.textContent || undefined;
    const critical = q(taskEl, 'Critical')?.textContent === '1';
    const outlineNum = q(taskEl, 'OutlineNumber')?.textContent || '';
    const wbsCode = q(taskEl, 'WBS')?.textContent || outlineNum;

    const startDate = parseMspdiDate(startStr) || new Date();
    const endDate = parseMspdiDate(finishStr) || addDays(startDate, 1);
    const duration = parseMspdiDuration(durationStr);

    const type = summary ? TaskType.Summary : milestone ? TaskType.Milestone : TaskType.Task;

    tasks.push({
      id: uid,
      wbsCode,
      name,
      type,
      level: Math.max(0, level),
      order: parseInt(id) || 0,
      startDate,
      endDate,
      duration,
      progress: pctComplete,
      priority,
      isMilestone: milestone,
      isCritical: critical,
      isCollapsed: false,
      resources: [],
      notes,
    });
  });

  // Reconstruct parent-child hierarchy from outline levels
  reconstructHierarchy(tasks);

  // Parse dependencies
  const dependencies: Dependency[] = [];
  const predecessorLinks = qAll(doc, 'PredecessorLink');
  predecessorLinks.forEach((linkEl) => {
    const linkEl2 = linkEl.parentElement;
    const toId = q(linkEl2!, 'UID')?.textContent;
    const fromId = q(linkEl, 'PredecessorUID')?.textContent;
    const type = q(linkEl, 'Type')?.textContent || '1'; // 1=FS default in MSPDI
    const lag = parseMspdiDurationDays(q(linkEl, 'LinkLag')?.textContent || 'PT0S');

    if (fromId && toId && fromId !== '0') {
      dependencies.push({
        id: generateId(),
        fromTaskId: fromId,
        toTaskId: toId,
        type: mspdiDepType(type),
        lag,
      });
    }
  });

  // Parse resources
  const resources: Resource[] = [];
  const RESOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
  const resourceEls = qAll(doc, 'Resource');
  resourceEls.forEach((resEl, idx) => {
    const uid = q(resEl, 'UID')?.textContent || '';
    if (!uid || uid === '0') return;
    const name = q(resEl, 'Name')?.textContent || 'Resource';
    const resType = q(resEl, 'Type')?.textContent || '1';
    const email = q(resEl, 'EmailAddress')?.textContent || undefined;
    const maxUnits = parseFloat(q(resEl, 'MaxUnits')?.textContent || '1') * 100;
    const standardRate = parseFloat(q(resEl, 'StandardRate')?.textContent || '0');

    resources.push({
      id: uid,
      name,
      type: resType === '0' ? 'Work' : resType === '1' ? 'Material' : 'Cost',
      initials: name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2),
      email,
      maxUnits,
      standardRate,
      color: RESOURCE_COLORS[idx % RESOURCE_COLORS.length],
    });
  });

  // Parse assignments
  const assignments: Assignment[] = [];
  const assignmentEls = qAll(doc, 'Assignment');
  assignmentEls.forEach((assignEl) => {
    const taskId = q(assignEl, 'TaskUID')?.textContent;
    const resourceId = q(assignEl, 'ResourceUID')?.textContent;
    const units = parseFloat(q(assignEl, 'Units')?.textContent || '1') * 100;

    if (taskId && resourceId && taskId !== '0' && resourceId !== '0') {
      assignments.push({
        id: generateId(),
        taskId,
        resourceId,
        units,
      });
      // Update task resources
      const task = tasks.find((t) => t.id === taskId);
      if (task && !task.resources.includes(resourceId)) {
        task.resources.push(resourceId);
      }
    }
  });

  const project: Project = {
    id: generateId(),
    name: projectName,
    startDate: projectStart,
    company,
    currency,
    author,
    tasks,
    dependencies,
    resources,
    assignments,
    isDirty: false,
    fileType: 'mpp',
    settings: defaultSettings(),
  };

  return { project, warnings };
}

// ============================================================================
// Helper Functions
// ============================================================================

function reconstructHierarchy(tasks: Task[]): void {
  // Use a stack approach: track the last task at each outline level
  const stack: Task[] = [];

  tasks.forEach((task) => {
    // Pop stack down to current level
    while (stack.length > task.level) {
      stack.pop();
    }

    // Parent is the top of the stack
    if (stack.length > 0) {
      task.parentId = stack[stack.length - 1].id;
    }

    // Update parent type to Summary if it has children
    if (task.parentId) {
      const parent = tasks.find((t) => t.id === task.parentId);
      if (parent && parent.type !== TaskType.Summary) {
        parent.type = TaskType.Summary;
      }
    }

    stack.push(task);
  });
}

function parseMspdiDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Handle ISO 8601 with and without timezone
  // Formats: 2024-01-15T08:00:00, 2024-01-15T08:00:00Z
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  } catch {
    // ignore
  }
  return null;
}

function parseMspdiDuration(duration: string): number {
  // ISO 8601 duration: PT8H = 8 hours = 1 day, P5D = 5 days
  if (!duration) return 0;
  const dayMatch = duration.match(/P(\d+(?:\.\d+)?)D/);
  const hourMatch = duration.match(/T(\d+(?:\.\d+)?)H/);
  const minMatch = duration.match(/T(?:\d+H)?(\d+(?:\.\d+)?)M/);

  let days = 0;
  if (dayMatch) days += parseFloat(dayMatch[1]);
  if (hourMatch) days += parseFloat(hourMatch[1]) / 8; // 8h workday
  if (minMatch) days += parseFloat(minMatch[1]) / (8 * 60);

  return Math.round(days);
}

function parseMspdiDurationDays(duration: string): number {
  // Lag is often in minutes in MSPDI (LinkLag)
  if (!duration) return 0;
  // Some versions use raw numbers in minutes
  if (/^\d+$/.test(duration)) {
    return Math.round(parseInt(duration) / (8 * 60)); // Convert minutes to days
  }
  return parseMspdiDuration(duration);
}

function mspdiDepType(type: string): DependencyType {
  // MSPDI: 0=FF, 1=FS, 2=SF, 3=SS
  switch (type) {
    case '0': return DependencyType.FF;
    case '1': return DependencyType.FS;
    case '2': return DependencyType.SF;
    case '3': return DependencyType.SS;
    default: return DependencyType.FS;
  }
}

function parseMspdiPriority(priority: string): Task['priority'] {
  const val = parseInt(priority);
  if (val >= 750) return 'Critical';
  if (val >= 600) return 'High';
  if (val >= 400) return 'Normal';
  return 'Low';
}

function isOle2Format(buffer: ArrayBuffer): boolean {
  // OLE2 magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const header = new Uint8Array(buffer.slice(0, 8));
  return (
    header[0] === 0xD0 && header[1] === 0xCF &&
    header[2] === 0x11 && header[3] === 0xE0 &&
    header[4] === 0xA1 && header[5] === 0xB1 &&
    header[6] === 0x1A && header[7] === 0xE1
  );
}

function extractXmlFromBinary(buffer: ArrayBuffer): string | null {
  // Try to find XML content embedded in binary
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  // Look for XML declaration or Project element
  const xmlStart = text.indexOf('<?xml');
  if (xmlStart !== -1) {
    return text.substring(xmlStart);
  }

  const projectStart = text.indexOf('<Project');
  if (projectStart !== -1) {
    return '<?xml version="1.0"?>' + text.substring(projectStart);
  }

  return null;
}

function createEmptyProjectFromFilename(filename: string): Project {
  return {
    id: generateId(),
    name: filename.replace(/\.mpp$/i, ''),
    startDate: new Date(),
    tasks: [],
    dependencies: [],
    resources: [],
    assignments: [],
    isDirty: false,
    fileType: 'mpp',
    settings: defaultSettings(),
  };
}

/**
 * Parse MS Project XML file (.xml export from MSP)
 */
export async function parseMspXmlFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  return parseMspdiXml(text, file.name);
}
