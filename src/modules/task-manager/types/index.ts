export enum DependencyType {
  FS = "fs", // Finish-to-Start: source must finish before target can start
  SS = "ss", // Start-to-Start: source must start before target can start
  FF = "ff", // Finish-to-Finish: source must finish before target can finish
  SF = "sf"  // Start-to-Finish: source must start before target can finish
}

export interface Link {
  id: string | number;
  source: string | number; // ID of source task
  target: string | number; // ID of target task
  type: DependencyType; // FS, SS, FF, SF
  lag?: number; // Time lag in milliseconds (positive = lag, negative = lead)
}

export interface Task {
  id: string | number;
  text: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number; // In milliseconds
  progress?: number; // 0-100 percentage
  priority?: 'low' | 'medium' | 'high';
  type?: 'task' | 'project' | 'milestone';
  parentId?: string | number; // For hierarchical tasks (null/undefined for root)
  order?: number; // Display order among siblings
  notes?: string;
  customFields?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  // Computed properties (often derived)
  level?: number; // Depth in hierarchy (0 = root)
  isLeaf?: boolean; // Has no children
  isProject?: boolean; // Is a project/summary type
}

export interface TaskFilter {
  text?: string; // Search in task text/description
  type?: ('task' | 'project' | 'milestone')[]; // Filter by task types
  priority?: ('low' | 'medium' | 'high')[]; // Filter by priority levels
  dateRange?: { start: Date; end: Date }; // Filter by date range
  progressRange?: { min: number; max: number }; // Filter by progress
  parentId?: string | number; // Filter by parent
  customFields?: Record<string, any>; // Filter by custom field values
}

export interface TaskSort {
  field: keyof Task;
  direction: 'asc' | 'desc';
}

export interface BatchOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string | number; message: string }>;
}