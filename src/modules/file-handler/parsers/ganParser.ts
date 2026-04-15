/**
 * GAN File Parser
 * 
 * Parses GanttProject .gan XML files into internal ProjectData structure.
 */

import type { ProjectData, Task, Link } from '../types';

/**
 * Parse a .gan (GanttProject) XML file into ProjectData structure
 */
export async function parseGanFile(file: File): Promise<ProjectData> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Failed to parse .gan file: ${parseError.textContent}`);
  }
  
  const projectElement = xmlDoc.querySelector('project');
  if (!projectElement) {
    throw new Error('Invalid .gan file: missing <project> root element');
  }
  
  const projectData = parseProjectElement(projectElement);
  return projectData;
}

/**
 * Parse the project root element
 */
function parseProjectElement(projectEl: Element): ProjectData {
  const name = projectEl.getAttribute('name') || 'Untitled Project';
  const version = projectEl.getAttribute('version') || '';
  
  const projectData: ProjectData = {
    id: crypto.randomUUID(),
    name,
    tasks: [],
    links: [],
    metadata: {
      version,
      locale: projectEl.getAttribute('locale') || 'en',
    },
  };
  
  // Parse tasks - recursively process all task elements
  const tasksElement = projectEl.querySelector('tasks');
  if (tasksElement) {
    const { tasks, links } = parseAllTasks(tasksElement, null);
    projectData.tasks = tasks;
    projectData.links = links;
  }
  
  // Parse resources
  const resourcesElement = projectEl.querySelector('resources');
  if (resourcesElement) {
    projectData.resources = parseResourcesElement(resourcesElement);
  }
  
  // Parse allocations
  const allocationsElement = projectEl.querySelector('allocations');
  if (allocationsElement) {
    projectData.assignments = parseAllocationsElement(allocationsElement);
  }
  
  // Parse description
  const descriptionEl = projectEl.querySelector('description');
  if (descriptionEl) {
    projectData.description = descriptionEl.textContent?.trim() || '';
  }
  
  return projectData;
}

/**
 * Recursively parse all tasks from a container element (tasks element or a task element)
 */
function parseAllTasks(container: Element, parentId: string | number | null): { tasks: Task[]; links: Link[] } {
  const tasks: Task[] = [];
  const links: Link[] = [];
  
  // Get direct child task elements
  const childNodes = Array.from(container.childNodes);
  
  for (const node of childNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    
    const taskEl = node as Element;
    if (taskEl.tagName !== 'task') continue;
    
    // Parse this task
    const task = parseTaskElement(taskEl, parentId);
    if (task) {
      tasks.push(task);
      
      // Parse dependencies from this task
      const dependElements = taskEl.querySelectorAll('depend');
      dependElements.forEach((dependEl) => {
        const link = parseDependencyElement(dependEl, task.id);
        if (link) {
          links.push(link);
        }
      });
      
      // Recursively parse child tasks of this task
      const { tasks: childTasks, links: childLinks } = parseAllTasks(taskEl, task.id);
      tasks.push(...childTasks);
      links.push(...childLinks);
    }
  }
  
  return { tasks, links };
}

/**
 * Parse a single <task> element
 */
function parseTaskElement(taskEl: Element, parentId: string | number | null): Task | null {
  const id = taskEl.getAttribute('id');
  if (!id) return null;
  
  const name = taskEl.getAttribute('name') || 'Untitled Task';
  const startStr = taskEl.getAttribute('start');
  const durationStr = taskEl.getAttribute('duration'); // In days
  const completeStr = taskEl.getAttribute('complete') || '0';
  const color = taskEl.getAttribute('color');
  const meetingStr = taskEl.getAttribute('meeting') || 'false';
  const expandStr = taskEl.getAttribute('expand') || 'true';
  
  // Parse start date
  let start: Date;
  if (startStr) {
    start = parseGanDate(startStr);
  } else {
    start = new Date();
  }
  
  // Calculate end date from duration (duration is in days)
  const duration = parseInt(durationStr || '0', 10);
  const end = new Date(start);
  end.setDate(end.getDate() + duration);
  
  // Determine task type
  const isMeeting = meetingStr === 'true';
  const isMilestone = duration === 0 && !isMeeting;
  const type = isMilestone ? 'milestone' : 'task';
  
  // Check if this is a parent/summary task (has child task elements)
  const hasChildren = Array.from(taskEl.childNodes).some(
    (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'task'
  );
  const finalType = hasChildren ? 'project' : type;
  
  // Parse notes
  const notesEl = taskEl.querySelector('notes');
  const notes = notesEl?.textContent?.trim() || undefined;
  
  // Parse custom properties
  const customFields: Record<string, unknown> = {};
  const customProps = taskEl.querySelectorAll('customproperty');
  customProps.forEach((prop) => {
    const propId = prop.getAttribute('taskproperty-id');
    const value = prop.getAttribute('value');
    if (propId && value) {
      customFields[propId] = value;
    }
  });
  
  if (color) {
    customFields['color'] = color;
  }
  
  return {
    id,
    text: name,
    start,
    end,
    duration: duration * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    progress: parseInt(completeStr, 10),
    type: finalType,
    parentId: parentId ?? undefined,
    notes,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
  };
}

/**
 * Parse a <depend> element into a Link
 */
function parseDependencyElement(dependEl: Element, targetTaskId: string | number): Link | null {
  const typeStr = dependEl.getAttribute('type');
  const sourceId = dependEl.getAttribute('id');
  
  if (!sourceId) return null;
  
  // GanttProject dependency types:
  // 0 = Finish-to-Start (FS)
  // 1 = Start-to-Start (SS)
  // 2 = Finish-to-Finish (FF)
  // 3 = Start-to-Finish (SF)
  const typeMap: Record<string, 'fs' | 'ss' | 'ff' | 'sf'> = {
    '0': 'fs',
    '1': 'ss',
    '2': 'ff',
    '3': 'sf',
  };
  
  const type = typeMap[typeStr || '0'] || 'fs';
  const difference = parseInt(dependEl.getAttribute('difference') || '0', 10);
  
  return {
    id: crypto.randomUUID(),
    source: sourceId,
    target: targetTaskId,
    type,
    lag: difference * 24 * 60 * 60 * 1000, // Convert days to milliseconds
  };
}

/**
 * Parse <resources> element
 */
function parseResourcesElement(resourcesElement: Element) {
  const resources: Array<{ id: string | number; name: string; role?: string }> = [];
  const resourceElements = resourcesElement.querySelectorAll('resource');
  
  resourceElements.forEach((resEl) => {
    const id = resEl.getAttribute('id');
    const name = resEl.getAttribute('name');
    
    if (id && name) {
      resources.push({
        id,
        name,
        role: resEl.getAttribute('function') || undefined,
      });
    }
  });
  
  return resources;
}

/**
 * Parse <allocations> element
 */
function parseAllocationsElement(allocationsElement: Element) {
  const allocations: Array<{ taskId: string | number; resourceId: string | number; units?: number }> = [];
  const allocationElements = allocationsElement.querySelectorAll('allocation');
  
  allocationElements.forEach((allocEl) => {
    const taskId = allocEl.getAttribute('task-id');
    const resourceId = allocEl.getAttribute('resource-id');
    const loadStr = allocEl.getAttribute('load') || '100';
    
    if (taskId && resourceId) {
      allocations.push({
        taskId,
        resourceId,
        units: parseFloat(loadStr) / 100,
      });
    }
  });
  
  return allocations;
}

/**
 * Parse date string in GanttProject format (YYYY-MM-DD)
 * Uses UTC to avoid local timezone offset shifting the date.
 * GanttProject stores dates as calendar dates (YYYY-MM-DD) — treating them
 * as UTC midnight matches GanttProject's display behavior.
 */
function parseGanDate(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const utcDate = Date.UTC(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10)
    );
    return new Date(utcDate);
  }
  // Fallback for other formats
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) return fallback;
  return new Date(); // Safe fallback to current date
}

/**
 * Parse a .gan XML string into ProjectData structure
 */
export async function parseGanString(xmlString: string): Promise<ProjectData> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Failed to parse .gan file: ${parseError.textContent}`);
  }

  const projectElement = xmlDoc.querySelector('project');
  if (!projectElement) {
    throw new Error('Invalid .gan file: missing <project> root element');
  }

  return parseProjectElement(projectElement);
}

/**
 * Validate a .gan file without fully parsing it
 */
export async function validateGanFile(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    const text = await file.text();
    
    // Check if it's valid XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      errors.push('Invalid XML format');
      return { isValid: false, errors };
    }
    
    // Check for project root element
    const projectElement = xmlDoc.querySelector('project');
    if (!projectElement) {
      errors.push('Missing <project> root element');
    }
    
    // Check for tasks element
    const tasksElement = projectElement?.querySelector('tasks');
    if (!tasksElement) {
      errors.push('Missing <tasks> element');
    }
    
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    return { isValid: false, errors: [`Failed to read file: ${error}`] };
  }
}

