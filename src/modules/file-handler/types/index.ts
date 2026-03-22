export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  tasks: Task[];
  links: Link[];
  resources?: Resource[];
  assignments?: Assignment[];
  customFields?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string | number;
  text: string;
  description?: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number; // 0-100
  type?: 'task' | 'project' | 'milestone';
  parentId?: string | number;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface Link {
  id: string | number;
  source: string | number;
  target: string | number;
  type: 'fs' | 'ss' | 'ff' | 'sf';
  lag?: number;
}

export interface Resource {
  id: string | number;
  name: string;
  role?: string;
  // Additional resource properties
}

export interface Assignment {
  taskId: string | number;
  resourceId: string | number;
  units?: number; // Assignment units (e.g., 0.5 for 50%)
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ message: string; type: string }>;
  warnings: Array<{ message: string; type: string }>;
}