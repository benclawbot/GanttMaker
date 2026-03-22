# Gantt Chart Maker - Architecture Overview

## High-Level Structure

The Gantt Chart Maker follows a modular architecture designed for maintainability, extensibility, and clarity. The system is organized into distinct modules, each with a single responsibility, making it easy for developers (and LLMs) to understand and navigate.

```
src/
├── assets/                 # Static assets (icons, images, etc.)
├── components/             # Shared React components (UI primitives)
├── hooks/                  # Custom React hooks (shared across modules)
├── modules/                # Feature modules (core functionality)
│   ├── gantt-chart/        # Core Gantt chart rendering and interaction
│   ├── file-handler/       # Import/export functionality (.gan files)
│   ├── task-manager/       # Task CRUD operations and state management
│   └── dependency-manager/ # Task dependency logic and validation
├── services/               # External service abstractions
├── utils/                  # Utility functions (date, math, helpers)
├── types/                  # Global TypeScript type definitions
├── styles/                 # Global styles and theming
└── context/                # React context providers
```

## Module Responsibilities

### 1. Gantt Chart Module (`modules/gantt-chart/`)
- **Purpose**: Render and manage the visual Gantt chart interface
- **Responsibilities**:
  - Timeline rendering (using SVAR React Gantt)
  - Task bar dragging, resizing, and selection
  - Viewport management (zoom, scroll)
  - Task editing UI integration
- **Public Interface**: Exported components and hooks for task manipulation

### 2. File Handler Module (`modules/file-handler/`)
- **Purpose**: Handle import and export of project files
- **Responsibilities**:
  - Parsing .gan (GanttProject) XML format
  - Serializing project data to .gan format
  - File validation and error handling
  - Progress reporting for large files
- **Extension Points**: Designed to support additional formats (CSV, MS Project, JSON)

### 3. Task Manager Module (`modules/task-manager/`)
- **Purpose**: Manage task data and operations
- **Responsibilities**:
  - Task creation, reading, updating, deletion (CRUD)
  - Task validation and normalization
  - Hierarchical task management (indent/outdent)
  - Task filtering, sorting, and searching
- **Extension Points**: Custom task fields, validation rules, behavior plugins

### 4. Dependency Manager Module (`modules/dependency-manager/`)
- **Purpose**: Manage task dependencies and relationships
- **Responsibilities**:
  - Dependency creation and validation
  - Cycle detection in dependency graphs
  - Dependency visualization logic
  - Future: Critical path calculation
- **Extension Points**: Additional dependency types, custom validation rules

## Data Flow

```
User Interaction 
        ↓
UI Components (in modules)
        ↓
Module Services (business logic)
        ↓
State Updates (React state or Zustand)
        ↓
Re-render of Affected Components
        ↓
Persistence Layer (localStorage, file system, etc.)
```

## Extension Guidelines

1. **Adding New Features**: Create new modules under `src/modules/` following the existing pattern
2. **Extending Existing Modules**: Use the documented extension points in each module
3. **Cross-Module Communication**: Use events, callbacks, or shared state services
4. **UI Components**: Place shared components in `src/components/`, module-specific in module directories
5. **Styling**: Use Tailwind CSS utility classes; extend `src/styles/` for global styles

## Documentation Navigation

For detailed information about specific modules, see:
- [`gantt-chart module guide`](./module-guides/gantt-chart.md)
- [`file-handler module guide`](./module-guides/file-handler.md)
- [`task-manager module guide`](./module-guides/task-manager.md)
- [`dependency-manager module guide`](./module-guides/dependency-manager.md)

For extension patterns, see [`extension points guide`](./extension-points.md).