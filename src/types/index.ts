// ============================================================================
// Core Project Types
// ============================================================================

export enum DependencyType {
  FS = 'FS', // Finish-to-Start
  SS = 'SS', // Start-to-Start
  FF = 'FF', // Finish-to-Finish
  SF = 'SF', // Start-to-Finish
}

export enum TaskType {
  Task = 'task',
  Summary = 'summary',
  Milestone = 'milestone',
}

export enum ConstraintType {
  ASAP = 'ASAP',
  ALAP = 'ALAP',
  MSO = 'MSO',  // Must Start On
  MFO = 'MFO',  // Must Finish On
  SNET = 'SNET', // Start No Earlier Than
  SNLT = 'SNLT', // Start No Later Than
  FNET = 'FNET', // Finish No Earlier Than
  FNLT = 'FNLT', // Finish No Later Than
}

export interface Task {
  id: string;
  wbsCode?: string;
  name: string;
  type: TaskType;
  parentId?: string;
  
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  
  progress: number; // 0-100
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  
  isMilestone: boolean;
  isCritical: boolean;
  isCollapsed: boolean;
  
  resources: string[]; // resource IDs
  
  notes?: string;
  constraint?: ConstraintType;
  constraintDate?: Date;
  
  // Computed
  level: number;
  order: number;
  
  // Display
  color?: string;
  
  // MS Project / GAN specific
  customFields?: Record<string, unknown>;
}

export interface Dependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
  lag: number; // days (positive=lag, negative=lead)
}

export interface Resource {
  id: string;
  name: string;
  type: 'Work' | 'Material' | 'Cost';
  initials?: string;
  email?: string;
  maxUnits: number; // percentage 0-100+
  standardRate?: number;
  overtimeRate?: number;
  color?: string;
  notes?: string;
}

export interface Assignment {
  id: string;
  taskId: string;
  resourceId: string;
  units: number; // percentage
  work?: number; // hours
  start?: Date;
  finish?: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  author?: string;
  company?: string;
  currency?: string;
  
  tasks: Task[];
  dependencies: Dependency[];
  resources: Resource[];
  assignments: Assignment[];
  
  settings: ProjectSettings;
  
  isDirty: boolean;
  filePath?: string;
  fileType?: 'gan' | 'mpp' | 'xml' | 'new';
}

export interface ProjectSettings {
  workHoursPerDay: number;
  workDaysPerWeek: number;
  workingDays: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  defaultView: 'gantt' | 'resources' | 'tracking';
  zoomLevel: ZoomLevel;
  showCriticalPath: boolean;
  showBaseline: boolean;
  showWeekends: boolean;
  showDependencies: boolean;
  showProgress: boolean;
}

export type ZoomLevel = 'days' | 'weeks' | 'months' | 'quarters' | 'years';

export interface TimelineColumn {
  date: Date;
  label: string;
  width: number;
  isWeekend?: boolean;
  isToday?: boolean;
}

export interface GanttColumn {
  id: string;
  label: string;
  field: keyof Task | string;
  width: number;
  editable?: boolean;
  type?: 'text' | 'date' | 'number' | 'progress' | 'resource' | 'select';
  options?: string[];
  format?: (value: unknown) => string;
}

export type AppView = 'gantt' | 'resources' | 'tracking' | 'calendar';

export interface SelectionState {
  taskIds: Set<string>;
  dependencyIds: Set<string>;
  resourceIds: Set<string>;
  anchorTaskId?: string;
}

export interface EditingCell {
  taskId: string;
  field: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'task' | 'dependency' | 'canvas';
  targetId?: string;
}

export interface ImportResult {
  project: Project;
  warnings: string[];
  errors: string[];
}

