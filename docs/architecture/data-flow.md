# Data Flow Documentation

This document describes how data flows through the Gantt Chart Maker application.

## Overview

The application follows a unidirectional data flow pattern:

```
User Action → Component → Context/Service → State Update → Re-render
                                           ↓
                                    Persistence (File I/O)
```

## State Management

### TaskContext (Single Source of Truth)

The `TaskContext` provides centralized state management for:

```typescript
interface ProjectState {
  id: string;           // Unique project identifier
  name: string;         // Project name
  tasks: Task[];        // All tasks in the project
  links: Link[];        // All dependencies between tasks
  isDirty: boolean;     // Whether unsaved changes exist
  fileHandle: FileSystemFileHandle | null;  // File handle for native save
}
```

### State Update Flow

1. **User Interaction**: User interacts with Gantt chart (drag task, create dependency, etc.)
2. **Event Handler**: Component captures the event
3. **Context Dispatch**: Component calls context action (addTask, updateTask, etc.)
4. **Reducer Processing**: Reducer processes action and updates state immutably
5. **Re-render**: React re-renders components that use the changed state

## Module Interactions

### Gantt Chart Module

```
User Action → GanttChart Component
                    ↓
            onTasksUpdated callback
                    ↓
            TaskContext.updateTask()
                    ↓
            State Update → Re-render
```

### File Handler Module

```
Open Flow:
  File Input → FileSystemFileHandle
                    ↓
            importGanFile() (parser)
                    ↓
            TaskContext.loadProject()
                    ↓
            State Update → Re-render

Save Flow:
  User clicks Save → TaskContext.state
                    ↓
            exportGanFile() (serializer)
                    ↓
            Blob → FileSystemFileHandle.createWritable()
                    ↓
            File saved, isDirty = false
```

### Dependency Manager Module

```
Create Dependency:
  User creates link in Gantt chart
                    ↓
  validateDependency() (checks for duplicates)
                    ↓
  detectCyclesAfterAdd() (prevents circular deps)
                    ↓
  TaskContext.addLink()
                    ↓
  State Update → Re-render
```

## Data Transformations

### Internal → Gantt Chart (Tasks)

```typescript
// Internal Task format
interface Task {
  id: string;
  text: string;
  startDate: Date;     // Internal use
  endDate: Date;       // Internal use
  progress: number;     // 0-100
  type: 'task' | 'project' | 'milestone';
  // ...
}

// SVAR Gantt Task format
interface GanttTask {
  id: string;
  text: string;
  start: Date;         // SVAR format
  end: Date;           // SVAR format
  progress: number;     // 0-1 (different scale!)
  type: 'task' | 'project' | 'milestone';
  // ...
}
```

Transformation in `GanttChart` component:
```typescript
const ganttTasks = state.tasks.map(task => ({
  id: task.id,
  text: task.text,
  start: task.startDate,
  end: task.endDate,
  progress: task.progress / 100,  // Convert 0-100 to 0-1
  type: task.type,
}));
```

### Internal → .gan Export (Tasks)

```typescript
// Internal Task → File Handler Task
interface Task {
  id: string | number;
  text: string;
  startDate: Date;     // Internal
  endDate: Date;       // Internal
  // ...
}

// File Handler format
interface Task {
  id: string | number;
  text: string;
  start: Date;         // Serialized
  end: Date;           // Serialized
  duration?: number;   // In days for .gan
  // ...
}
```

### .gan Import → Internal (Tasks)

Reverse transformation when importing:
```typescript
const tasks: Task[] = projectData.tasks.map(t => ({
  id: t.id,
  text: t.text,
  startDate: t.start,   // Convert to Date
  endDate: t.end,      // Convert to Date
  duration: t.duration ? t.duration * 24 * 60 * 60 * 1000 : undefined, // days → ms
  progress: t.progress,
  type: t.type,
}));
```

## Virtual DOM Optimization

React optimizes re-renders through:

1. **Memoization**: `useMemo`, `useCallback` prevent unnecessary computations
2. **Context Splitting**: Separate contexts for frequently/rarely changing data
3. **Selector Pattern**: Components subscribe only to needed state slices

## Async Operations

### File Loading

```typescript
async function handleOpenFile() {
  // 1. Show file picker
  const [fileHandle] = await window.showOpenFilePicker(...);
  
  // 2. Read file
  const file = await fileHandle.getFile();
  
  // 3. Parse XML
  const projectData = await importGanFile(file);
  
  // 4. Transform data
  const tasks = transformToInternal(projectData.tasks);
  
  // 5. Update state
  loadProject({ name: projectData.name, tasks, links });
}
```

### Error Handling Flow

```
File Parsing Error
        ↓
  Catch in handler
        ↓
  Console error log
        ↓
  User Alert
        ↓
  State unchanged
```

## Persistence Strategy

### Auto-save (Future Enhancement)

```typescript
// Conceptual flow
useEffect(() => {
  if (state.isDirty) {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage(state);
    }, 5000); // Debounce 5 seconds
    
    return () => clearTimeout(timeoutId);
  }
}, [state, state.isDirty]);
```

### File Handle Reuse

When opening a file with File System Access API:
1. Store `fileHandle` in state
2. On subsequent saves, reuse the handle
3. User doesn't need to pick location again

## Performance Considerations

### Large Task Lists (1000+ tasks)

1. **Virtualization**: SVAR Gantt handles visible rows only
2. **Memoization**: Tasks array transformations are memoized
3. **Debouncing**: Drag operations debounced to reduce state updates

### Dependency Validation

For large dependency graphs:
- Uses adjacency list for O(1) lookups
- DFS for cycle detection: O(V + E)
- Validation runs on dependency creation, not on every render

## Related Documentation

- [Architecture Overview](./overview.md)
- [Task Manager Module Guide](./module-guides/task-manager.md)
- [File Handler Module Guide](./module-guides/file-handler.md)
- [Dependency Manager Module Guide](./module-guides/dependency-manager.md)