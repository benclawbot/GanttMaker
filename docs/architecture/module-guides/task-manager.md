# Task Manager Module Guide

## Purpose
The Task Manager Module is responsible for managing task data and operations, including creation, reading, updating, deletion (CRUD), validation, and hierarchical task management.

## Responsibilities
- Task CRUD operations (create, read, update, delete)
- Task validation and data normalization
- Hierarchical task management (indent/outdent, parent-child relationships)
- Task filtering, sorting, and searching
- Task state management (progress, status, etc.)
- Batch operations on multiple tasks
- Maintaining task ordering and sequencing

## Public Interface

### Functions
- `createTask(taskData: Omit<Task, 'id'>): Task`: Create a new task
- `getTask(id: string | number): Task | undefined`: Retrieve a task by ID
- `updateTask(id: string | number, updates: Partial<Task>): Task`: Update an existing task
- `deleteTask(id: string | number): boolean`: Delete a task
- `getTasks(filter?: TaskFilter): Task[]`: Get tasks with optional filtering
- `indentTask(taskId: string | number): Task`: Indent a task (make it a child)
- `outdentTask(taskId: string | number): Task`: Outdent a task (move it up a level)
- `moveTask(taskId: string | number, targetId: string | number, position: 'before' | 'after' | 'inside'): Task`: Move a task in the hierarchy
- `getRootTasks(): Task[]`: Get all top-level tasks
- `getDescendants(taskId: string | number): Task[]`: Get all descendant tasks
- `getAncestors(taskId: string | number): Task[]`: Get all ancestor tasks

### Types
- `Task` (`src/modules/task-manager/types/index.ts`): Core task interface
- `TaskFilter` (`src/modules/task-manager/types/index.ts`): Filtering options for tasks
- `TaskSort` (`src/modules/task-manager/types/index.ts`): Sorting options for tasks
- `BatchOperationResult` (`src/modules/task-manager/types/index.ts`): Result of batch operations

## Data Structures

### Task
```typescript
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
```

### TaskFilter
```typescript
export interface TaskFilter {
  text?: string; // Search in task text/description
  type?: TaskType[]; // Filter by task types
  priority?: Priority[]; // Filter by priority levels
  dateRange?: { start: Date; end: Date }; // Filter by date range
  progressRange?: { min: number; max: number }; // Filter by progress
  parentId?: string | number; // Filter by parent
  customFields?: Record<string, any>; // Filter by custom field values
}
```

## Dependencies
- **Internal**:
  - Dependency Manager Module (for task dependency validation)
  - Utility modules (for date manipulation, ID generation, etc.)
- **External**:
  - UUID library (for generating unique IDs - optional)
  - Lodash or similar (for utility functions - optional)

## Extension Points

### 1. Custom Task Fields
Extend the Task interface with domain-specific fields by:
- Extending the base Task interface
- Adding validation rules for custom fields
- Providing UI components for editing custom fields

### 2. Validation Rules
Add custom validation logic:
- Task-specific validation (e.g., dates must be in future)
- Cross-field validation (e.g., end date must be after start date)
- Business rule validation (e.g., certain task types require specific fields)

### 3. Task Behavior Plugins
Add plugins that modify task behavior:
- Automatic duration calculation based on estimates
- Automatic progress rollup from subtasks
- Dependency-based scheduling adjustments

### 4. Persistence Strategies
Different ways to persist task data:
- Local storage implementation
- IndexedDB implementation
- Remote API synchronization
- Conflict resolution strategies

## Usage Example

```typescript
import { 
  createTask, 
  getTask, 
  updateTask, 
  deleteTask,
  indentTask,
  outdentTask,
  getTasks
} from '@/modules/task-manager';
// or with path alias
import { 
  createTask, 
  getTask, 
  updateTask, 
  deleteTask,
  indentTask,
  outdentTask,
  getTasks
} from '@modules/task-manager';

// Create a new task
const newTask = createTask({
  text: "Implement login feature",
  startDate: new Date(2024, 0, 15),
  endDate: new Date(2024, 0, 22),
  priority: 'high',
  type: 'task'
});

// Indent a task to make it a child
indentTask(newTask.id);

// Get all tasks
const allTasks = getTasks();

// Filter tasks
const highPriorityTasks = getTasks({
  priority: ['high'],
  text: 'login'
});
```

## Implementation Notes

### State Management
The Task Manager typically manages its own state using:
- React Context (for simple applications)
- Zustand or Redux Toolkit (for more complex state needs)
- Immer for immutable state updates

State is usually structured as:
```typescript
{
  tasks: Record<string, Task>; // Map of task ID to task
  taskOrder: string[]; // Array of task IDs in display order
  nextId: number | string; // For ID generation
}
```

### Performance Considerations
- Uses map/object lookups for O(1) task access by ID
- Maintains separate ordering array for efficient list rendering
- Implements memoized selectors for filtered/sorted task lists
- Uses virtualization in UI components for large task sets

### Hierarchical Tasks
- Supports unlimited nesting depth
- Provides convenience methods for tree traversal
- Maintains referential integrity when moving tasks
- Automatically updates parent/child relationships

### Task Ordering
- Maintains explicit order among sibling tasks
- Provides move operations that preserve hierarchy
- Supports drag-and-drop reordering in UI

## Related Documentation
- [Architecture Overview](./overview.md)
- [Gantt Chart Module Guide](./gantt-chart.md)
- [Dependency Manager Module Guide](./dependency-manager.md)
- [File Handler Module Guide](./file-handler.md)
- [Extension Points Guide](../extension-points.md)