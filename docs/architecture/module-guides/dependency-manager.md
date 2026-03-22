# Dependency Manager Module Guide

## Purpose
The Dependency Manager Module is responsible for managing task dependencies and relationships, including creation, validation, and visualization of dependencies between tasks.

## Responsibilities
- Creating and managing task dependencies (links)
- Validating dependency integrity (no cycles, valid references)
- Detecting and preventing circular dependencies
- Managing different dependency types (FS, SS, FF, SF)
- Providing dependency visualization data
- Future: Critical path calculation and scheduling algorithms
- Managing dependency lag/lead time

## Public Interface

### Functions
- `createDependency(dependencyData: Omit<Link, 'id'>): Link`: Create a new dependency
- `getDependency(id: string | number): Link | undefined`: Retrieve a dependency by ID
- `updateDependency(id: string | number, updates: Partial<Link>): Link`: Update an existing dependency
- `deleteDependency(id: string | number): boolean`: Delete a dependency
- `getDependenciesForTask(taskId: string | number): { predecessors: Link[], successors: Link[] }`: Get dependencies for a specific task
- `validateDependencies(): ValidationResult`: Validate all dependencies for integrity
- `detectCycles(): CycleDetectionResult`: Detect circular dependencies
- `getPredecessorTasks(taskId: string | number): Task[]`: Get all tasks that must complete before this task
- `getSuccessorTasks(taskId: string | number): Task[]`: Get all tasks that depend on this task
- `getDependencyTree(rootTaskId: string | number): DependencyTree`: Get dependency tree rooted at a task

### Types
- `Link` (`src/modules/dependency-manager/types/index.ts`): Core dependency/link interface
- `DependencyType` (`src/modules/dependency-manager/types/index.ts`): Enum of dependency types
- `ValidationResult` (`src/modules/dependency-manager/types/index.ts`): Dependency validation results
- `CycleDetectionResult` (`src/modules/dependency-manager/types/index.ts`): Cycle detection results
- `DependencyTree` (`src/modules/dependency-manager/types/index.ts`): Tree structure of dependencies

## Data Structures

### Link (Dependency)
```typescript
export interface Link {
  id: string | number;
  source: string | number; // ID of source task
  target: string | number; // ID of target task
  type: DependencyType; // FS, SS, FF, SF
  lag?: number; // Time lag in milliseconds (positive = lag, negative = lead)
  // Additional properties can be added by extensions
}
```

### DependencyType
```typescript
export enum DependencyType {
  FS = "fs", // Finish-to-Start: source must finish before target can start
  SS = "ss", // Start-to-Start: source must start before target can start
  FF = "ff", // Finish-to-Finish: source must finish before target can finish
  SF = "sf"  // Start-to-Finish: source must start before target can finish
}
```

### ValidationResult
```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: Warning[];
}

export interface ValidationError {
  type: 'missing_task' | 'self_dependency' | 'invalid_type' | 'other';
  message: string;
  dependencyId?: string | number;
  sourceTaskId?: string | number;
  targetTaskId?: string | number;
}

export interface Warning {
  type: 'redundant_dependency' | 'unusual_lag' | 'other';
  message: string;
  dependencyId?: string | number;
}
```

### CycleDetectionResult
```typescript
export interface CycleDetectionResult {
  hasCycles: boolean;
  cycles: string[][]; // Array of cycles, each cycle is array of task IDs
  path?: string[]; // One example cycle path
}
```

## Dependencies
- **Internal**:
  - Task Manager Module (for task validation and data)
- **External**:
  - Graph theory libraries (optional, for cycle detection algorithms)
  - UUID library (for generating unique IDs - optional)

## Extension Points

### 1. Additional Dependency Types
Extend the DependencyType enum with custom dependency types:
- Start-to-Day, Finish-to-Hour, etc. for specific industries
- Resource-based dependencies
- Date-constrained dependencies

### 2. Advanced Validation Rules
Add custom validation logic:
- Resource conflict detection
- Calendar-based validation (working days/holidays)
- Constraint-based validation (must start on specific date)
- Industry-specific dependency rules

### 3. Scheduling Algorithms
Implement scheduling calculations:
- Critical path method (CPM)
- Program Evaluation and Review Technique (PERT)
- Resource leveling algorithms
- What-if scenario analysis

### 4. Visualization Enhancements
Enhance dependency visualization:
- Different line styles for dependency types
- Dependency congestion routing
- Interactive dependency editing
- Dependency grouping and bundling

### 5. Lag/Led Features
Advanced lag/lead functionality:
- Working day-based lag calculation
- Variable lag based on task properties
- Constraint-based lag adjustment

## Usage Example

```typescript
import { 
  createDependency, 
  getDependency, 
  updateDependency,
  deleteDependency,
  getDependenciesForTask,
  validateDependencies,
  detectCycles
} from '@/modules/dependency-manager';
// or with path alias
import { 
  createDependency, 
  getDependency, 
  updateDependency,
  deleteDependency,
  getDependenciesForTask,
  validateDependencies,
  detectCycles
} from '@modules/dependency-manager';

// Create a Finish-to-Start dependency
const dependency = createDependency({
  source: "task1", // ID of predecessor task
  target: "task2", // ID of successor task
  type: "fs",      // Finish-to-Start
  lag: 0           // No lag
});

// Get dependencies for a task
const { predecessors, successors } = getDependenciesForTask("task2");

// Validate all dependencies
const validationResult = validateDependencies();
if (!validationResult.isValid) {
  console.error("Dependency validation errors:", validationResult.errors);
}

// Detect cycles
const cycleResult = detectCycles();
if (cycleResult.hasCycles) {
  console.warn("Circular dependencies detected:", cycleResult.cycles);
}
```

## Implementation Notes

### State Management
The Dependency Manager typically manages its own state using:
- Map/Set data structures for efficient lookups
- Adjacency list representation for dependency graphs
- Immutable state updates using Immer or similar

State structure example:
```typescript
{
  dependencies: Record<string, Link>; // Map of dependency ID to dependency
  dependencyOrder: string[]; // Array for consistent ordering
  // Derived data (often computed on demand or cached)
  taskPredecessors: Record<string, string[]>; // Map task ID to predecessor task IDs
  taskSuccessors: Record<string, string[]>; // Map task ID to successor task IDs
}
```

### Graph Algorithms
- Uses adjacency list representation for dependency graph
- Implements depth-first search (DFS) for cycle detection
- Uses topological sorting for validation and scheduling preparation
- Considers memoizing expensive computations for large graphs

### Dependency Validation Rules
1. **Referential Integrity**: Source and target tasks must exist
2. **No Self-Dependencies**: A task cannot depend on itself
3. **Valid Dependency Type**: Type must be one of FS, SS, FF, SF
4. **No Duplicate Dependencies**: Prevent duplicate source-target-type combinations
5. **Future**: Constraint validation (lag within working hours, etc.)

### Performance Considerations
- O(1) dependency lookup by ID
- O(V + E) for cycle detection (where V = tasks, E = dependencies)
- O(D) for getting dependencies of a task (where D = dependencies for that task)
- Lazy computation of derived data (predecessor/successor lists)
- Web worker support for cycle detection in large graphs

### Integration with Gantt Chart
- Provides dependency data for visual rendering
- Validates user-created dependencies before allowing them
- Supports interactive dependency creation (drag-from-taskbar)
- Provides highlighting for dependency paths on hover/selection

## Related Documentation
- [Architecture Overview](./overview.md)
- [Gantt Chart Module Guide](./gantt-chart.md)
- [Task Manager Module Guide](./task-manager.md)
- [File Handler Module Guide](./file-handler.md)
- [Extension Points Guide](../extension-points.md)