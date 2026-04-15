/**
 * GanttProject .gan File Parser
 * Parses XML-based .gan files into our internal Project structure.
 * Reference: GanttProject XmlSerializer.kt (biz.ganttproject.core/io/XmlSerializer.kt)
 *
 * Key GAN format rules discovered from GanttProject source:
 * - Dates in .gan files are in YYYY-MM-DD format (no time component).
 * - Duration is in working days. Duration=N means task ends on (start + N - 1) days.
 *   e.g. start=Jan 13, duration=5 → task spans Jan 13,14,15,16,17 (5 days).
 *   So endDate = addDays(startDate, duration - 1) for non-milestones.
 *   Milestones always have endDate = startDate.
 * - GAN milestone: meeting="true" OR (no meeting attr AND duration=0).
 */

import type { Project, Task, Dependency, Resource, Assignment } from '../types';
import { TaskType, DependencyType, ConstraintType } from '../types';
import { addDays } from 'date-fns';
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
  const webLink = projectEl.getAttribute('webLink') || undefined;

  // Parse tasks recursively
  const tasks: Task[] = [];
  const tasksEl = projectEl.querySelector('tasks');
  if (tasksEl) {
    parseGanTasks(tasksEl, null, 0, tasks, warnings);
  }

  // Parse dependencies: <depend> is a child of each <task> element
  // Structure: <task id="1"><depend id="2" type="2" difference="0"/></task>
  const dependencies: Dependency[] = [];
  projectEl.querySelectorAll('task depend').forEach((depEl) => {
    const taskEl = depEl.parentElement as Element | null;
    const fromId = taskEl?.getAttribute('id');
    const toId = depEl.getAttribute('id');
    const type = depEl.getAttribute('type') || '2'; // 2=FS default
    const difference = parseInt(depEl.getAttribute('difference') || '0');

    if (fromId && toId) {
      dependencies.push({
        id: generateId(),
        fromTaskId: String(fromId),
        toTaskId: String(toId),
        type: ganDepTypeToDep(type),
        lag: difference,
      });
    }
  });

  // Also support flat <tasks><depend>...</depend></tasks> style (some exports)
  projectEl.querySelectorAll('tasks > depend').forEach((depEl) => {
    const prevTask = (depEl.previousElementSibling as Element | null);
    const fromId = prevTask?.getAttribute('id');
    const toId = depEl.getAttribute('id');
    const type = depEl.getAttribute('type') || '2';
    const difference = parseInt(depEl.getAttribute('difference') || '0');
    if (fromId && toId && !dependencies.some(d => d.toTaskId === toId)) {
      dependencies.push({
        id: generateId(),
        fromTaskId: String(fromId),
        toTaskId: String(toId),
        type: ganDepTypeToDep(type),
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

  // Parse assignments (allocations)
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
    webLink,
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

    // GAN milestone: meeting="true" → milestone; otherwise duration=0 means milestone
    const meetingAttr = taskEl.getAttribute('meeting');
    const isMeeting = meetingAttr === 'true';
    const duration = parseInt(durStr) || 1;
    const isMilestone = isMeeting || (meetingAttr !== 'false' && duration === 0);

    // Critical: endDate = startDate + (duration - 1) for regular tasks.
    // In GAN format, duration=N means the task spans N days starting at 'start',
    // ending on day (start + N - 1). Milestones always end at their start date.
    const startDate = parseGanDate(startStr) || new Date();
    const endDate = isMilestone
      ? new Date(startDate)
      : addDays(startDate, duration - 1);

    const progress = parseInt(completionStr) || 0;
    const color = taskEl.getAttribute('color') || undefined;
    const notes = taskEl.querySelector('notes')?.textContent?.trim() || undefined;
    const expandStr = taskEl.getAttribute('expand');

    // Additional GAN fields (from GanttProject XmlSerializer.kt XmlTask)
    const uid = taskEl.getAttribute('uid') || undefined;
    const shape = taskEl.getAttribute('shape') || undefined;
    const isProjectTask = taskEl.getAttribute('project') === 'true';
    const priority = ganPriorityToPriority(taskEl.getAttribute('priority'));
    const webLink = taskEl.getAttribute('webLink') || undefined;

    // Baseline/third date (earliest start)
    const thirdDateStr = taskEl.getAttribute('thirdDate') || undefined;
    const thirdDate = thirdDateStr ? parseGanDate(thirdDateStr) || undefined : undefined;
    const thirdDateConstraintRaw = taskEl.getAttribute('thirdDate-constraint');
    const thirdDateConstraint = thirdDateConstraintRaw
      ? ganThirdDateConstraintToConstraint(parseInt(thirdDateConstraintRaw))
      : undefined;

    // GAN expand="false" means collapsed; default is expanded (true)
    const isCollapsed = expandStr === 'false';

    // Child tasks determine if this is a summary task
    const childTaskEls = Array.from(taskEl.children).filter((el) => el.tagName === 'task');
    const type: TaskType = isProjectTask
      ? TaskType.Project
      : isMilestone
        ? TaskType.Milestone
        : childTaskEls.length > 0
          ? TaskType.Summary
          : TaskType.Task;

    const task: Task = {
      id: String(id),
      uid,
      name,
      type,
      parentId: parentId || undefined,
      level,
      order: idx,
      startDate,
      endDate,
      duration: isMilestone ? 0 : duration,
      progress,
      priority,
      isMilestone,
      isCritical: false,
      isCollapsed,
      resources: [],
      color,
      notes,
      webLink,
      customFields: {
        ...(thirdDate && { thirdDate }),
        ...(thirdDateConstraint && { thirdDateConstraint }),
        ...(shape && { shape }),
      },
    };

    result.push(task);

    // Recurse into children
    if (childTaskEls.length > 0) {
      parseGanTasks(taskEl, String(id), level + 1, result, warnings);
    }
  });
}

/**
 * Parse a GAN date string (YYYY-MM-DD) as a local-time Date.
 * GanttProject stores pure calendar dates with no timezone.
 * Using noon avoids any DST-boundary off-by-one that midnight could cause.
 */
function parseGanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  // Fallback: GanttProject also accepts d/m/yyyy in legacy files
  const altMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (altMatch) {
    const day = parseInt(altMatch[1]);
    const month = parseInt(altMatch[2]) - 1;
    const year = parseInt(altMatch[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  return null;
}

/**
 * Map GAN dependency type string to our DependencyType enum.
 * GAN types: 0=SS, 1=SF, 2=FS, 3=FF
 */
function ganDepTypeToDep(type: string): DependencyType {
  switch (type) {
    case '0': return DependencyType.SS;
    case '1': return DependencyType.SF;
    case '2': return DependencyType.FS;
    case '3': return DependencyType.FF;
    default: return DependencyType.FS;
  }
}

/**
 * Map GAN priority string to our priority type.
 * GAN values: 0=Low, 1=Normal, 2=High, 3=Critical
 */
function ganPriorityToPriority(priority: string | null): Task['priority'] {
  switch (priority) {
    case '0': return 'Low';
    case '1': return 'Normal';
    case '2': return 'High';
    case '3': return 'Critical';
    default: return 'Normal';
  }
}

/**
 * Map GAN thirdDate-constraint integer to ConstraintType.
 * GAN values: 0=GAN_END, 1=GAN_START, 2=GAN_MUST_START_ON, 3=GAN_MUST_FINISH_ON,
 *             4=START_NO_EARLIER, 5=FINISH_NO_LATER
 */
function ganThirdDateConstraintToConstraint(val: number): ConstraintType | undefined {
  switch (val) {
    case 0: return ConstraintType.FNET; // finish no earlier than thirdDate
    case 1: return ConstraintType.SNET; // start no earlier than thirdDate
    case 2: return ConstraintType.MSO;  // must start on thirdDate
    case 3: return ConstraintType.MFO;  // must finish on thirdDate
    case 4: return ConstraintType.SNET; // start no earlier
    case 5: return ConstraintType.FNLT; // finish no later
    default: return undefined;
  }
}
