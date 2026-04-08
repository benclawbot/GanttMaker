import { createContext, useContext } from 'react';
import type {
  Project, Task, Dependency, Resource, Assignment, ProjectSettings, ZoomLevel
} from '../types';
import { TaskType, DependencyType } from '../types';
import { addDays, differenceInCalendarDays } from 'date-fns';

// ============================================================================
// Default Data
// ============================================================================

const today = new Date();
today.setHours(0, 0, 0, 0);

export function createDefaultProject(): Project {
  const t = (offset: number) => addDays(today, offset);

  const tasks: Task[] = [
    {
      id: '1', name: 'Project Kickoff', type: TaskType.Summary, level: 0, order: 0,
      startDate: t(0), endDate: t(14), duration: 14, progress: 60,
      priority: 'High', isMilestone: false, isCritical: false, isCollapsed: false, resources: [],
    },
    {
      id: '2', name: 'Requirements Gathering', type: TaskType.Task, parentId: '1', level: 1, order: 1,
      startDate: t(0), endDate: t(5), duration: 5, progress: 100,
      priority: 'High', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r1', 'r2'],
    },
    {
      id: '3', name: 'Stakeholder Review', type: TaskType.Task, parentId: '1', level: 1, order: 2,
      startDate: t(5), endDate: t(8), duration: 3, progress: 75,
      priority: 'Normal', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r2'],
    },
    {
      id: '4', name: 'Requirements Sign-off', type: TaskType.Milestone, parentId: '1', level: 1, order: 3,
      startDate: t(8), endDate: t(8), duration: 0, progress: 0,
      priority: 'Critical', isMilestone: true, isCritical: true, isCollapsed: false, resources: [],
    },
    {
      id: '5', name: 'Design Phase', type: TaskType.Summary, level: 0, order: 4,
      startDate: t(8), endDate: t(22), duration: 14, progress: 30,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: [],
    },
    {
      id: '6', name: 'UI/UX Design', type: TaskType.Task, parentId: '5', level: 1, order: 5,
      startDate: t(8), endDate: t(15), duration: 7, progress: 50,
      priority: 'High', isMilestone: false, isCritical: false, isCollapsed: false, resources: ['r3'],
    },
    {
      id: '7', name: 'Architecture Design', type: TaskType.Task, parentId: '5', level: 1, order: 6,
      startDate: t(9), endDate: t(16), duration: 7, progress: 40,
      priority: 'High', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r1'],
    },
    {
      id: '8', name: 'Database Design', type: TaskType.Task, parentId: '5', level: 1, order: 7,
      startDate: t(10), endDate: t(22), duration: 12, progress: 20,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: ['r1', 'r3'],
    },
    {
      id: '9', name: 'Development', type: TaskType.Summary, level: 0, order: 8,
      startDate: t(22), endDate: t(50), duration: 28, progress: 10,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: [],
    },
    {
      id: '10', name: 'Backend Development', type: TaskType.Task, parentId: '9', level: 1, order: 9,
      startDate: t(22), endDate: t(40), duration: 18, progress: 15,
      priority: 'High', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r1'],
    },
    {
      id: '11', name: 'Frontend Development', type: TaskType.Task, parentId: '9', level: 1, order: 10,
      startDate: t(25), endDate: t(45), duration: 20, progress: 10,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: ['r3'],
    },
    {
      id: '12', name: 'Integration', type: TaskType.Task, parentId: '9', level: 1, order: 11,
      startDate: t(40), endDate: t(50), duration: 10, progress: 0,
      priority: 'High', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r1', 'r3'],
    },
    {
      id: '13', name: 'Testing', type: TaskType.Summary, level: 0, order: 12,
      startDate: t(50), endDate: t(64), duration: 14, progress: 0,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: [],
    },
    {
      id: '14', name: 'Unit Testing', type: TaskType.Task, parentId: '13', level: 1, order: 13,
      startDate: t(50), endDate: t(57), duration: 7, progress: 0,
      priority: 'Normal', isMilestone: false, isCritical: false, isCollapsed: false, resources: ['r2'],
    },
    {
      id: '15', name: 'UAT', type: TaskType.Task, parentId: '13', level: 1, order: 14,
      startDate: t(57), endDate: t(64), duration: 7, progress: 0,
      priority: 'High', isMilestone: false, isCritical: true, isCollapsed: false, resources: ['r2'],
    },
    {
      id: '16', name: 'Go Live', type: TaskType.Milestone, level: 0, order: 15,
      startDate: t(64), endDate: t(64), duration: 0, progress: 0,
      priority: 'Critical', isMilestone: true, isCritical: true, isCollapsed: false, resources: [],
    },
  ];

  const dependencies: Dependency[] = [
    { id: 'd1', fromTaskId: '2', toTaskId: '3', type: DependencyType.FS, lag: 0 },
    { id: 'd2', fromTaskId: '3', toTaskId: '4', type: DependencyType.FS, lag: 0 },
    { id: 'd3', fromTaskId: '4', toTaskId: '6', type: DependencyType.FS, lag: 0 },
    { id: 'd4', fromTaskId: '4', toTaskId: '7', type: DependencyType.FS, lag: 0 },
    { id: 'd5', fromTaskId: '7', toTaskId: '8', type: DependencyType.FS, lag: 1 },
    { id: 'd6', fromTaskId: '8', toTaskId: '10', type: DependencyType.FS, lag: 0 },
    { id: 'd7', fromTaskId: '6', toTaskId: '11', type: DependencyType.FS, lag: 3 },
    { id: 'd8', fromTaskId: '10', toTaskId: '12', type: DependencyType.FS, lag: 0 },
    { id: 'd9', fromTaskId: '11', toTaskId: '12', type: DependencyType.FS, lag: 0 },
    { id: 'd10', fromTaskId: '12', toTaskId: '14', type: DependencyType.FS, lag: 0 },
    { id: 'd11', fromTaskId: '14', toTaskId: '15', type: DependencyType.FS, lag: 0 },
    { id: 'd12', fromTaskId: '15', toTaskId: '16', type: DependencyType.FS, lag: 0 },
  ];

  const resources: Resource[] = [
    { id: 'r1', name: 'Alex Chen', type: 'Work', initials: 'AC', maxUnits: 100, color: '#3b82f6' },
    { id: 'r2', name: 'Maria Garcia', type: 'Work', initials: 'MG', maxUnits: 100, color: '#10b981' },
    { id: 'r3', name: 'Sam Lee', type: 'Work', initials: 'SL', maxUnits: 100, color: '#f59e0b' },
  ];

  return {
    id: crypto.randomUUID(),
    name: 'Sample Project',
    startDate: today,
    tasks,
    dependencies,
    resources,
    assignments: [],
    isDirty: false,
    fileType: 'new',
    settings: defaultSettings(),
  };
}

export function defaultSettings(): ProjectSettings {
  return {
    workHoursPerDay: 8,
    workDaysPerWeek: 5,
    workingDays: [false, true, true, true, true, true, false],
    defaultView: 'gantt',
    zoomLevel: 'weeks',
    showCriticalPath: false,
    showBaseline: false,
    showWeekends: false,
    showDependencies: true,
    showProgress: true,
  };
}

// ============================================================================
// Task Utilities
// ============================================================================

export function generateId(): string {
  return crypto.randomUUID();
}

export function computeWBS(tasks: Task[]): Task[] {
  const result = [...tasks];
  const counters: Map<string | undefined, number> = new Map();

  result.forEach((task) => {
    const key = task.parentId || '';
    const count = (counters.get(key) || 0) + 1;
    counters.set(key, count);

    const parentTask = task.parentId ? result.find((t) => t.id === task.parentId) : undefined;
    task.wbsCode = parentTask?.wbsCode ? `${parentTask.wbsCode}.${count}` : `${count}`;
  });

  return result;
}

export function getVisibleTasks(tasks: Task[], collapsedIds: Set<string>): Task[] {
  const hiddenParents = new Set<string>();

  collapsedIds.forEach((id) => {
    // Mark all descendants as hidden
    const descendants = getDescendants(tasks, id);
    descendants.forEach((d) => hiddenParents.add(d.id));
  });

  return tasks.filter((t) => !hiddenParents.has(t.id));
}

export function getDescendants(tasks: Task[], parentId: string): Task[] {
  const result: Task[] = [];
  const children = tasks.filter((t) => t.parentId === parentId);
  children.forEach((child) => {
    result.push(child);
    result.push(...getDescendants(tasks, child.id));
  });
  return result;
}

export function getChildren(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((t) => t.parentId === parentId);
}

export function hasChildren(tasks: Task[], taskId: string): boolean {
  return tasks.some((t) => t.parentId === taskId);
}

export function recalculateSummaryDates(tasks: Task[]): Task[] {
  const result = [...tasks];

  // Process from leaf to root
  const processTask = (taskId: string) => {
    const task = result.find((t) => t.id === taskId);
    if (!task) return;

    const children = result.filter((t) => t.parentId === taskId);
    if (children.length === 0) return;

    children.forEach((child) => processTask(child.id));

    const starts = children.map((c) => c.startDate.getTime());
    const ends = children.map((c) => c.endDate.getTime());
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));

    task.startDate = minStart;
    task.endDate = maxEnd;
    task.duration = differenceInCalendarDays(maxEnd, minStart);
    task.progress = Math.round(children.reduce((acc, c) => acc + c.progress, 0) / children.length);
  };

  // Find root tasks
  result.filter((t) => !t.parentId).forEach((t) => processTask(t.id));
  return result;
}

// ============================================================================
// Context
// ============================================================================

export interface ProjectContextType {
  project: Project;
  
  // View state
  view: string;
  setView: (view: string) => void;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  selection: Set<string>;
  selectTask: (id: string, multi: boolean, range: boolean) => void;
  clearSelection: () => void;
  selectedDependencyId: string | null;
  selectDependency: (id: string | null) => void;
  
  // Task operations
  addTask: (parentId?: string, afterId?: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteSelectedTasks: () => void;
  indentTask: (id: string) => void;
  outdentTask: (id: string) => void;
  moveTaskUp: (id: string) => void;
  moveTaskDown: (id: string) => void;
  
  // Dependency operations
  addDependency: (dep: Omit<Dependency, 'id'>) => void;
  deleteDependency: (id: string) => void;
  
  // Resource operations
  addResource: (resource: Omit<Resource, 'id'>) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  
  // Project operations
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  
  // File operations
  openFile: () => void;
  saveFile: () => void;
  exportAs: (format: string) => void;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
