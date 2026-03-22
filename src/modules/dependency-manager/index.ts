/**
 * Dependency Manager Module
 * 
 * Manages task dependencies and relationships, including creation, validation,
 * and detection of circular dependencies.
 */

import { DependencyType } from './types';
import type { Link, ValidationResult, CycleDetectionResult } from './types';

// ============================================================================
// State
// ============================================================================

interface DependencyState {
  links: Link[];
  // Derived data structures for efficient lookups
  taskPredecessors: Map<string | number, Set<string | number>>;
  taskSuccessors: Map<string | number, Set<string | number>>;
}

let state: DependencyState = {
  links: [],
  taskPredecessors: new Map(),
  taskSuccessors: new Map(),
};

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Initialize the dependency manager with existing links
 */
export function initializeDependencies(links: Link[]): void {
  state.links = [...links];
  rebuildLookupMaps();
}

/**
 * Get all dependencies
 */
export function getDependencies(): Link[] {
  return [...state.links];
}

/**
 * Create a new dependency
 */
export function createDependency(
  source: string | number,
  target: string | number,
  type: DependencyType = DependencyType.FS,
  lag?: number
): Link {
  // Validate the dependency
  const validation = validateDependency(source, target, type);
  if (!validation.isValid) {
    throw new Error(validation.errors[0]?.message || 'Invalid dependency');
  }
  
  // Check for cycles
  const cycleCheck = detectCyclesAfterAdd(source, target);
  if (cycleCheck.hasCycles) {
    throw new Error('Creating this dependency would create a circular dependency');
  }
  
  const link: Link = {
    id: crypto.randomUUID(),
    source,
    target,
    type,
    lag,
  };
  
  state.links.push(link);
  updateLookupMaps(link, 'add');
  
  return link;
}

/**
 * Delete a dependency
 */
export function deleteDependency(id: string | number): boolean {
  const index = state.links.findIndex((l) => l.id === id);
  if (index === -1) return false;
  
  const link = state.links[index];
  state.links.splice(index, 1);
  updateLookupMaps(link, 'remove');
  
  return true;
}

/**
 * Get dependencies for a specific task
 */
export function getDependenciesForTask(
  taskId: string | number
): { predecessors: Link[]; successors: Link[] } {
  const predecessors = state.links.filter((l) => l.target === taskId);
  const successors = state.links.filter((l) => l.source === taskId);
  return { predecessors, successors };
}

/**
 * Get predecessor tasks for a specific task
 */
export function getPredecessorTasks(taskId: string | number): Array<{ id: string | number; type: DependencyType }> {
  const predecessors = state.links.filter((l) => l.target === taskId);
  return predecessors.map((p) => ({ id: p.source, type: p.type }));
}

/**
 * Get successor tasks for a specific task
 */
export function getSuccessorTasks(taskId: string | number): Array<{ id: string | number; type: DependencyType }> {
  const successors = state.links.filter((l) => l.source === taskId);
  return successors.map((s) => ({ id: s.target, type: s.type }));
}

/**
 * Validate all dependencies
 */
export function validateDependencies(): ValidationResult {
  const errors: Array<{ message: string; type: string }> = [];
  const warnings: Array<{ message: string; type: string }> = [];
  
  for (const link of state.links) {
    // Check for self-dependency
    if (link.source === link.target) {
      errors.push({
        message: `Task cannot depend on itself`,
        type: 'self_dependency',
      });
    }
    
    // Check for duplicate dependencies
    const duplicates = state.links.filter(
      (l) =>
        l.id !== link.id &&
        l.source === link.source &&
        l.target === link.target &&
        l.type === link.type
    );
    if (duplicates.length > 0) {
      warnings.push({
        message: `Duplicate dependency: ${link.source} -> ${link.target}`,
        type: 'redundant_dependency',
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a specific dependency before creating
 */
export function validateDependency(
  source: string | number,
  target: string | number,
  type: DependencyType
): ValidationResult {
  const errors: Array<{ message: string; type: string }> = [];
  
  // Check for self-dependency
  if (source === target) {
    errors.push({
      message: 'A task cannot depend on itself',
      type: 'self_dependency',
    });
  }
  
  // Check for duplicate
  const exists = state.links.some(
    (l) => l.source === source && l.target === target && l.type === type
  );
  if (exists) {
    errors.push({
      message: 'This dependency already exists',
      type: 'duplicate_dependency',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Detect circular dependencies in the current graph
 */
export function detectCycles(): CycleDetectionResult {
  // Use DFS to detect cycles
  const visited = new Set<string | number>();
  const recursionStack = new Set<string | number>();
  const cycles: string[][] = [];
  
  function dfs(node: string | number, path: string[]): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(String(node));
    
    const successors = state.taskSuccessors.get(node) || new Set();
    for (const successor of successors) {
      if (!visited.has(successor)) {
        if (dfs(successor, [...path])) {
          return true;
        }
      } else if (recursionStack.has(successor)) {
        // Found a cycle
        const cycleStart = path.indexOf(String(successor));
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        } else {
          cycles.push([...path, String(successor)]);
        }
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // Run DFS from each unvisited node
  for (const link of state.links) {
    if (!visited.has(link.source)) {
      dfs(link.source, []);
    }
  }
  
  return {
    hasCycles: cycles.length > 0,
    cycles,
    path: cycles[0],
  };
}

/**
 * Check if adding a specific dependency would create a cycle
 */
export function detectCyclesAfterAdd(
  source: string | number,
  target: string | number
): CycleDetectionResult {
  // Temporarily add the link
  const tempLink: Link = {
    id: 'temp',
    source,
    target,
    type: DependencyType.FS,
  };
  
  updateLookupMaps(tempLink, 'add');
  const result = detectCycles();
  
  // Remove the temporary link
  updateLookupMaps(tempLink, 'remove');
  
  return result;
}

/**
 * Get the dependency graph as an adjacency list
 */
export function getDependencyGraph(): Map<string | number, Array<{ id: string | number; type: DependencyType }>> {
  const graph = new Map<string | number, Array<{ id: string | number; type: DependencyType }>>();
  
  for (const link of state.links) {
    const successors = graph.get(link.source) || [];
    successors.push({ id: link.target, type: link.type });
    graph.set(link.source, successors);
  }
  
  return graph;
}

/**
 * Get all tasks involved in dependencies
 */
export function getTasksWithDependencies(): Set<string | number> {
  const tasks = new Set<string | number>();
  for (const link of state.links) {
    tasks.add(link.source);
    tasks.add(link.target);
  }
  return tasks;
}

// ============================================================================
// Private Functions
// ============================================================================

/**
 * Rebuild lookup maps from current links
 */
function rebuildLookupMaps(): void {
  state.taskPredecessors.clear();
  state.taskSuccessors.clear();
  
  for (const link of state.links) {
    updateLookupMaps(link, 'add');
  }
}

/**
 * Update lookup maps when adding or removing a link
 */
function updateLookupMaps(link: Link, operation: 'add' | 'remove'): void {
  // Update predecessors map (target -> sources)
  let predecessors = state.taskPredecessors.get(link.target);
  if (!predecessors) {
    predecessors = new Set();
    state.taskPredecessors.set(link.target, predecessors);
  }
  if (operation === 'add') {
    predecessors.add(link.source);
  } else {
    predecessors.delete(link.source);
  }
  
  // Update successors map (source -> targets)
  let successors = state.taskSuccessors.get(link.source);
  if (!successors) {
    successors = new Set();
    state.taskSuccessors.set(link.source, successors);
  }
  if (operation === 'add') {
    successors.add(link.target);
  } else {
    successors.delete(link.target);
  }
}

// ============================================================================
// Re-export types
// ============================================================================

export type { Link, DependencyType, ValidationResult, CycleDetectionResult } from './types';