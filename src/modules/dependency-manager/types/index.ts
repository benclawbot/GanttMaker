export interface Link {
  id: string | number;
  source: string | number; // ID of source task
  target: string | number; // ID of target task
  type: DependencyType; // FS, SS, FF, SF
  lag?: number; // Time lag in milliseconds (positive = lag, negative = lead)
}

export enum DependencyType {
  FS = "fs", // Finish-to-Start: source must finish before target can start
  SS = "ss", // Start-to-Start: source must start before target can start
  FF = "ff", // Finish-to-Finish: source must finish before target can finish
  SF = "sf"  // Start-to-Finish: source must start before target can finish
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{ message: string; type: string }>;
  warnings: Array<{ message: string; type: string }>;
}

export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: string[][]; // Array of cycles, each cycle is array of task IDs
  path?: string[]; // One example cycle path
}

export interface DependencyTree {
  rootTaskId: string | number;
  tasks: Array<{
    id: string | number;
    dependencies: string[]; // IDs of direct dependencies
    dependents: string[]; // IDs of tasks that depend on this one
  }>;
}