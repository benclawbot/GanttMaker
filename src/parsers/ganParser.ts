/**
 * GanttProject .gan File Parser
 * Parses XML-based .gan files into our internal Project structure
 */

import type { Project, Task, Dependency, Resource, Assignment } from '../types';
import { TaskType, DependencyType } from '../types';
import { addDays, parseISO } from 'date-fns';
import { generateId, defaultSettings } from '../store/projectStore';

interface ImportResult {
  project: Project;
  warnings: string[];
}

/**
 * Parse a .gan file (GanttProject XML format)
 */
export async function parseGanFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  const warnings: string[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent?.substring(0, 200)}`);
  }

  const projectEl = doc.querySelector('project');
  if (!projectEl) {
    throw new Error('Not a valid .gan file: missing <project> element');
  }

  // Project metadata
  const projectName = projectEl.getAttribute('name') || file.name.replace('.gan', '');
  const projectStart = parseGanDate(projectEl.getAttribute('date') || '') || new Date();
  const company = projectEl.getAttribute('company') || undefined;

  // Parse tasks recursively
  const tasks: Task[] = [];
  const tasksEl = projectEl.querySelector('tasks');
  if (tasksEl) {
    parseGanTasks(tasksEl, null, 0, tasks, warnings);
  }

  // Parse allocations/dependencies from tasks section
  const dependencies: Dependency[] = [];
  const depEls = projectEl.querySelectorAll('tasks > task depend, tasks depend, task depend');
  depEls.forEach((depEl) => {
    const taskEl = depEl.parentElement;
    const fromId = taskEl?.getAttribute('id');
    const toId = depEl.getAttribute('id');
    const type = depEl.getAttribute('type') || '2'; // 2=FS default
    const difference = parseInt(depEl.getAttribute('difference') || '0');

    if (fromId && toId) {
      const depType = ganDepTypeToDep(type);
      dependencies.push({
        id: generateId(),
        fromTaskId: String(fromId),
        toTaskId: String(toId),
        type: depType,
        lag: difference,
      });
    }
  });

  // Parse resources
  const resources: Resource[] = [];
  const resourceEls = projectEl.querySelectorAll('resources > resource');
  const RESOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  resourceEls.forEach((resEl, idx) => {
    const id = resEl.getAttribute('id');
    const name = resEl.getAttribute('name') || 'Resource';
    if (id) {
      resources.push({
        id: String(id),
        name,
        type: 'Work',
        initials: name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2),
        maxUnits: 100,
        color: RESOURCE_COLORS[idx % RESOURCE_COLORS.length],
      });
    }
  });

  // Parse assignments
  const assignments: Assignment[] = [];
  const allocationEls = projectEl.querySelectorAll('allocations > allocation');
  allocationEls.forEach((allocEl) => {
    const taskId = allocEl.getAttribute('task-id');
    const resourceId = allocEl.getAttribute('resource-id');
    const load = parseFloat(allocEl.getAttribute('load') || '100');
    if (taskId && resourceId) {
      assignments.push({
        id: generateId(),
        taskId: String(taskId),
        resourceId: String(resourceId),
        units: load,
      });
      // Also update task's resources list
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
    tasks,
    dependencies,
    resources,
    assignments,
    isDirty: false,
    fileType: 'gan',
    settings: defaultSettings(),
  };

  return { project, warnings };
}

function parseGanTasks(
  container: Element,
  parentId: string | null,
  level: number,
  result: Task[],
  warnings: string[],
): void {
  const taskEls = Array.from(container.children).filter((el) => el.tagName === 'task');

  taskEls.forEach((taskEl, idx) => {
    const id = taskEl.getAttribute('id');
    if (!id) {
      warnings.push(`Task missing id attribute, skipping`);
      return;
    }

    const name = taskEl.getAttribute('name') || 'Unnamed Task';
    const startStr = taskEl.getAttribute('start') || '';
    const durStr = taskEl.getAttribute('duration') || '1';
    const completionStr = taskEl.getAttribute('complete') || '0';
    const meetingAttr = taskEl.getAttribute('meeting');
    const color = taskEl.getAttribute('color') || undefined;
    const notes = taskEl.querySelector('notes')?.textContent || undefined;
    const expandStr = taskEl.getAttribute('expand');

    const startDate = parseGanDate(startStr) || new Date();
    const duration = parseInt(durStr) || 1;
    // GAN milestone is indicated by meeting="true" OR duration=0
    const isMilestone = meetingAttr === 'true' || (meetingAttr !== 'false' && duration === 0);
    const endDate = addDays(startDate, isMilestone ? 0 : duration);
    const progress = parseInt(completionStr) || 0;

    // Check if this task has sub-tasks
    const childTaskEls = Array.from(taskEl.children).filter((el) => el.tagName === 'task');
    const type = childTaskEls.length > 0 ? TaskType.Summary : isMilestone ? TaskType.Milestone : TaskType.Task;
    // GAN expand="false" means collapsed; default is expanded (true)
    const isCollapsed = expandStr === 'false';

    const task: Task = {
      id: String(id),
      name,
      type,
      parentId: parentId || undefined,
      level,
      order: idx,
      startDate,
      endDate,
      duration: isMilestone ? 0 : duration,
      progress,
      priority: 'Normal',
      isMilestone,
      isCritical: false,
      isCollapsed,
      resources: [],
      color,
      notes,
    };

    result.push(task);

    // Recurse into children
    if (childTaskEls.length > 0) {
      parseGanTasks(taskEl, String(id), level + 1, result, warnings);
    }
  });
}

function parseGanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // GanttProject uses YYYY-MM-DD format - parse as UTC to avoid local timezone shifts
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    // Use UTC to avoid timezone shifting the date
    const utcDate = Date.UTC(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3])
    );
    return new Date(utcDate);
  }
  return null;
}

function ganDepTypeToDep(type: string): DependencyType {
  // GanttProject types: 0=SS, 1=SF, 2=FS, 3=FF
  switch (type) {
    case '0': return DependencyType.SS;
    case '1': return DependencyType.SF;
    case '2': return DependencyType.FS;
    case '3': return DependencyType.FF;
    default: return DependencyType.FS;
  }
}



