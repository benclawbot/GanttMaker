export interface GanttTask {
  id: number | string;
  text: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number;
  type?: 'task' | 'project' | 'milestone';
  open?: boolean;
}

export interface GanttLink {
  id: number | string;
  source: number | string;
  target: number | string;
  type?: 'fs' | 'ss' | 'ff' | 'sf';
}