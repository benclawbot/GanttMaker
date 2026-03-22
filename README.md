# Gantt Chart Maker

A modular Gantt chart maker application with native support for .gan (GanttProject) files.

## Features

- **Interactive Gantt Chart**: Create and edit Gantt charts with drag-and-drop task scheduling
- **.gan File Support**: Open and save GanttProject .gan files natively
- **Task Dependencies**: Create Finish-to-Start dependencies between tasks
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- **Modular Architecture**: Well-organized codebase designed for easy extension and LLM navigation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in terminal).

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/           # Shared React components
│   └── ui/              # UI components (Toolbar, etc.)
├── context/             # React Context providers
│   └── TaskContext.tsx  # Task and project state management
├── modules/             # Feature modules
│   ├── gantt-chart/     # Core Gantt chart visualization
│   ├── file-handler/    # .gan file import/export
│   │   ├── parsers/     # File format parsers
│   │   └── serializers/ # File format serializers
│   ├── task-manager/    # Task CRUD operations
│   └── dependency-manager/ # Task dependency logic
├── styles/              # Global styles
├── types/               # Shared TypeScript types
└── utils/               # Utility functions

docs/
├── architecture/        # Architecture documentation
│   ├── overview.md      # High-level architecture
│   ├── module-guides/   # Detailed module documentation
│   └── extension-points.md # How to extend the system
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Module Guides](docs/architecture/module-guides/)
- [Extension Points](docs/architecture/extension-points.md)

## Architecture Highlights

### Modular Design

The application is organized into focused modules, each with a single responsibility:

1. **Gantt Chart Module**: Handles visualization and user interactions
2. **File Handler Module**: Manages .gan file import/export
3. **Task Manager Module**: Provides task CRUD operations
4. **Dependency Manager Module**: Handles task dependencies

### State Management

Uses React Context with a reducer pattern for predictable state management. The `TaskContext` provides:
- Task and link state
- CRUD operations
- Project management (load, save, reset)

### LLM-Friendly Documentation

Each module includes:
- Clear purpose and responsibilities
- Public interface documentation
- Data structure definitions
- Extension points
- Usage examples

## Extension Points

The architecture supports easy extension:

- **Custom Task Renderers**: Extend task bar appearance
- **Additional File Formats**: Add parsers/serializers for CSV, MS Project, etc.
- **Custom Validation Rules**: Add task or dependency validation
- **Plugin System**: Extend task behavior

See [Extension Points Guide](docs/architecture/extension-points.md) for details.

## Keyboard Shortcuts

- `Ctrl+N`: New project
- `Ctrl+O`: Open file
- `Ctrl+S`: Save file

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **SVAR React Gantt**: Gantt chart visualization
- **Vite**: Build tool

## License

MIT

## Acknowledgments

- [GanttProject](https://www.ganttproject.biz/) for the .gan file format specification
- [SVAR React Gantt](https://github.com/nicgirault/gantt-react) for the Gantt chart component