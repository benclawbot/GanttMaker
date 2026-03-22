# Gantt Chart Module Guide

## Purpose
The Gantt Chart Module is responsible for rendering and managing the visual Gantt chart interface, including timeline display, task manipulation, and user interactions.

## Responsibilities
- Rendering the Gantt chart timeline using SVAR React Gantt
- Managing task bar interactions (dragging, resizing, selection)
- Handling viewport operations (zoom, scroll, navigation)
- Integrating with task editing UI components
- Displaying task dependencies visually
- Managing chart state (selected tasks, hovered elements, etc.)

## Public Interface

### Components
- `GanttChart` (`src/modules/gantt-chart/components/GanttChart.tsx`): Main component that renders the Gantt chart

### Types
- `GanttTask` (`src/modules/gantt-chart/types/index.ts`): Extended task interface for Gantt chart
- `GanttLink` (`src/modules/gantt-chart/types/index.ts`: Link/dependency interface for Gantt chart

### Hooks
- `useGanttApi` (`src/modules/gantt-chart/hooks/useGanttApi.ts`): Hook to access Gantt chart API methods
- `useSelectedTasks` (`src/modules/gantt-chart/hooks/useSelectedTasks.ts`): Hook to get currently selected tasks
- `useViewport` (`src/modules/gantt-chart/hooks/useViewport.ts`): Hook to get current viewport state (zoom, scroll position)

## Data Structures

### GanttTask
```typescript
export interface GanttTask {
  id: number | string;
  text: string;
  start: Date;
  end: Date;
  duration?: number; // In milliseconds
  progress?: number; // 0-100 percentage
  type?: 'task' | 'project' | 'milestone';
  open?: boolean; // For project/summary tasks
  // Additional fields can be added by extensions
}
```

### GanttLink
```typescript
export interface GanttLink {
  id: number | string;
  source: number | string; // ID of source task
  target: number | string; // ID of target task
  type?: 'fs' | 'ss' | 'ff' | 'sf'; // Dependency type
}
```

## Dependencies
- **Internal**: 
  - Task Manager Module (for task data)
  - Dependency Manager Module (for dependency data)
- **External**:
  - SVAR React Gantt (`@svar-ui/react-gantt`) - Core rendering library

## Extension Points

### 1. Custom Task Renderers
Create custom task bar renderers by extending the task type and providing custom rendering logic.

### 2. Timeline Scale Plugins
Add custom time scales (hours, quarters, years) by extending the scales configuration.

### 3. Interaction Behavior
Override default interaction behaviors (drag, resize, selection) through callback props.

### 4. Additional Chart Layers
Add overlay layers for critical path, baseline comparisons, or resource views.

## Usage Example

```typescript
import { GanttChart } from '@/modules/gantt-chart/components/GanttChart';
// or with path alias
import { GanttChart } from '@modules/gantt-chart/components/GanttChart';

function ProjectView() {
  return (
    <div className="h-full w-full">
      <GanttChart />
    </div>
  );
}
```

## Implementation Notes

### State Management
The Gantt chart module primarily consumes state from:
- Task Manager (for task data)
- Dependency Manager (for link data)

It communicates changes back through callback functions passed as props.

### Performance Considerations
- Uses SVAR React Gantt's built-in virtualization for large task sets
- Minimizes re-renders by using React.memo where appropriate
- Delegates heavy computations (like dependency validation) to web workers when possible

### Styling
- Uses Tailwind CSS for layout and spacing
- SVAR React Gantt provides default styling that can be overridden
- Custom styles can be added in `src/modules/gantt-chart/styles/`

## Related Documentation
- [Architecture Overview](./overview.md)
- [Task Manager Module Guide](./task-manager.md)
- [Dependency Manager Module Guide](./dependency-manager.md)
- [Extension Points Guide](../extension-points.md)