# Extension Points Guide

This document outlines the extension points in the Gantt Chart Maker architecture, making it easy to add new features without modifying core modules.

## Overview

The Gantt Chart Maker is designed with extensibility in mind. Each module provides clear extension points that allow developers to add functionality while maintaining loose coupling and high cohesion.

## Module-Specific Extension Points

### 1. Gantt Chart Module (`src/modules/gantt-chart/`)

#### Custom Task Renderers
- **Location**: `src/modules/gantt-chart/renderers/`
- **How to extend**: Create a component that implements `TaskRenderer` interface
- **Registration**: Register via `GanttChart` component's `taskRenderer` prop
- **Example**: 
  ```typescript
  interface TaskRenderer {
    render(task: GanttTask, props: RenderProps): React.ReactNode;
  }
  ```

#### Timeline Scale Plugins
- **Location**: `src/modules/gantt-chart/scales/`
- **How to extend**: Implement `TimeScale` interface
- **Registration**: Add to the `scales` array prop of `GanttChart`
- **Example**:
  ```typescript
  interface TimeScale {
    unit: string;
    step: number;
    format: (date: Date) => string;
  }
  ```

#### Interaction Behavior Overrides
- **Location**: `src/modules/gantt-chart/interactions/`
- **How to extend**: Provide custom handler functions
- **Registration**: Via props like `onTaskDragStart`, `onTaskResize`, etc.
- **Example**:
  ```typescript
  <GanttChart 
    onTaskDragStart={(taskId, event) => {
      // Custom drag start logic
    }}
  />
  ```

#### Additional Chart Layers
- **Location**: `src/modules/gantt-chart/layers/`
- **How to extend**: Create layer components
- **Registration**: Render as children of `GanttChart` or via `layers` prop
- **Example**:
  ```typescript
  <GanttChart>
    <CriticalPathLayer tasks={tasks} links={links} />
    <BaselineLayer baselineTasks={baselineTasks} />
  </GanttChart>
  ```

### 2. File Handler Module (`src/modules/file-handler/`)

#### Additional Format Parsers
- **Location**: `src/modules/file-handler/parsers/`
- **How to extend**: Implement `FileParser` interface
- **Interface**:
  ```typescript
  interface FileParser {
    canHandle(file: File): boolean | Promise<boolean>;
    parse(file: File): Promise<ProjectData>;
    getExtensions(): string[];
    getMimeTypes(): string[];
  }
  ```
- **Registration**: Call `registerFormatParser(format, parser)` during initialization

#### Additional Format Serializers
- **Location**: `src/modules/file-handler/serializers/`
- **How to extend**: Implement `FileSerializer` interface
- **Interface**:
  ```typescript
  interface FileSerializer {
    canHandle(data: ProjectData): boolean;
    serialize(data: ProjectData): Promise<Blob>;
    getExtensions(): string[];
    getMimeTypes(): string[];
  }
  ```
- **Registration**: Call `registerFormatSerializer(format, serializer)` during initialization

#### Custom Field Handlers
- **Location**: `src/modules/file-handler/custom-fields/`
- **How to extend**: Implement `CustomFieldHandler` for specific field types
- **Registration**: Register with the file handler during initialization

#### Pre/Post Processing Hooks
- **Location**: `src/modules/file-handler/hooks/`
- **Types**: 
  - `beforeImport(file: File): Promise<File | void>`
  - `afterImport(data: ProjectData): Promise<ProjectData>`
  - `beforeExport(data: ProjectData): Promise<ProjectData | void>`
  - `afterExport(blob: Blob): Promise<Blob | void>`

### 3. Task Manager Module (`src/modules/task-manager/`)

#### Custom Task Fields
- **Location**: `src/modules/task-manager/custom-fields/`
- **How to extend**: 
  1. Extend the `Task` interface via declaration merging
  2. Add validation rules
  3. Provide UI components
- **Example**:
  ```typescript
  // In src/modules/task-manager/types/index.ts
  export interface Task {
    // ... existing fields
    estimatedHours?: number;
    actualHours?: number;
    // ... etc
  }
  ```

#### Validation Rules
- **Location**: `src/modules/task-manager/validation/`
- **How to extend**: Implement `TaskValidationRule` interface
- **Interface**:
  ```typescript
  interface TaskValidationRule {
    validate(task: Task): ValidationResult | Promise<ValidationResult>;
    getRuleId(): string;
    getErrorMessage(): string;
  }
  ```
- **Registration**: Register with the task manager's validation pipeline

#### Task Behavior Plugins
- **Location**: `src/modules/task-manager/plugins/`
- **How to extend**: Implement `TaskBehaviorPlugin` interface
- **Examples**:
  - Auto-progress calculation from subtasks
  - Automatic duration estimation
  - Dependency-based date adjustment
- **Registration**: Register plugins during task manager initialization

#### Persistence Strategies
- **Location**: `src/modules/task-manager/persistence/`
- **How to extend**: Implement `TaskPersistenceAdapter` interface
- **Interface**:
  ```typescript
  interface TaskPersistenceAdapter {
    loadTasks(): Promise<Task[]>;
    saveTasks(tasks: Task[]): Promise<void>;
    deleteTask(id: string | number): Promise<void>;
  }
  ```
- **Examples**: LocalStorageAdapter, IndexedDBAdapter, RestApiAdapter

### 4. Dependency Manager Module (`src/modules/dependency-manager/`)

#### Additional Dependency Types
- **Location**: `src/modules/dependency-manager/types/`
- **How to extend**: 
  1. Extend the `DependencyType` enum
  2. Add validation logic for new types
  3. Provide visualization rendering
- **Example**:
  ```typescript
  export enum DependencyType {
    // ... existing
    SD = "sd", // Start-to-Day
    FH = "fh"  // Finish-to-Hour
  }
  ```

#### Advanced Validation Rules
- **Location**: `src/modules/dependency-manager/validation/`
- **How to extend**: Implement `DependencyValidationRule` interface
- **Examples**:
  - Resource conflict detection
  - Calendar constraint validation
  - Industry-specific dependency rules

#### Scheduling Algorithms
- **Location**: `src/modules/dependency-manager/scheduling/`
- **How to extend**: Implement `SchedulingAlgorithm` interface
- **Interface**:
  ```typescript
  interface SchedulingAlgorithm {
    calculateSchedule(tasks: Task[], dependencies: Link[]): ScheduledTask[];
    getAlgorithmName(): string;
  }
  ```
- **Examples**: CriticalPathMethod, PertAlgorithm, ResourceLeveling

#### Visualization Enhancements
- **Location**: `src/modules/dependency-manager/visualization/`
- **How to extend**: Implement `DependencyVisualizer` interface
- **Examples**:
  - Different line styles/colors per dependency type
  - Congestion-aware routing
  - Interactive dependency editors

## Cross-Cutting Extension Points

### 1. Theme Extension
- **Location**: `src/styles/theme/`
- **How to extend**: 
  - Extend Tailwind configuration
  - Add CSS variables for colors, spacing, etc.
  - Create theme provider component
- **Usage**: Wrap application with `ThemeProvider`

### 2. Internationalization (i18n)
- **Location**: `src/locales/`
- **How to extend**: 
  - Add JSON files for each language
  - Use `useTranslation` hook
  - Register new languages with i18n provider
- **Example**:
  ```typescript
  // src/locales/en.json
  {
    "gantt.chart": "Gantt Chart",
    "task.new": "New Task",
    // ...
  }
  ```

### 3. Event System
- **Location**: `src/services/events/`
- **How to extend**: 
  - Publish/subscribe to domain events
  - Create custom event types
  - Add event handlers for side effects
- **Examples**:
  - `TASK_CREATED`
  - `DEPENDENCY_ADDED`
  - `FILE_IMPORTED`
  - `VIEW_CHANGED`

### 4. Service Extensions
- **Location**: `src/services/`
- **How to extend**: 
  - Add new service modules (authentication, analytics, etc.)
  - Use dependency injection or service locator pattern
  - Register services during application bootstrap

## Extension Best Practices

1. **Loose Coupling**: Extensions should depend on abstractions, not concrete implementations
2. **Single Responsibility**: Each extension should have one clear purpose
3. **Backward Compatibility**: Extensions should not break existing functionality
4. **Clear Contracts**: Use TypeScript interfaces to define clear extension points
5. **Documentation**: Document each extension point with usage examples
6. **Error Handling**: Extensions should handle errors gracefully and not crash the application
7. **Performance**: Consider performance implications, especially for UI extensions
8. **Testing**: Write unit tests for extensions

## Discovering Extension Points

To find extension points in the codebase:

1. Look for interfaces ending in `...able` or `...Handler` (e.g., `TaskRenderer`, `FileParser`)
2. Look for registration functions like `registerFormatParser`, `registerValidationRule`
3. Check module documentation for "Extension Points" sections
4. Look for props or callback options in component interfaces
5. Search for `// Extension point:` comments in the code

## Getting Started with Extensions

1. Copy the template from `docs/templates/extension-template.md`
2. Implement the required interface
3. Register your extension during application initialization
4. Test thoroughly with existing functionality
5. Document your extension in the project documentation

## Templates and Examples

See `docs/templates/` for:
- Extension template files
- Example implementations
- Registration patterns
- Testing guidelines

Remember: The goal is to make the system extensible without requiring modification to core modules, ensuring that updates to the core system don't break existing extensions.