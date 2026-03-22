# File Handler Module Guide

## Purpose
The File Handler Module is responsible for importing and exporting project files, with primary support for the .gan (GanttProject) format and extensibility for other formats.

## Responsibilities
- Parsing .gan (GanttProject) XML files into internal data structures
- Serializing internal project data to .gan format
- Validating file integrity and data consistency
- Handling file I/O operations (browser file system access)
- Providing progress reporting for large file operations
- Supporting extensibility for additional formats (CSV, MS Project, JSON, etc.)

## Public Interface

### Functions
- `importGanFile(file: File): Promise<ProjectData>`: Parse a .gan file and return project data
- `exportGanFile(projectData: ProjectData): Promise<Blob>`: Serialize project data to .gan blob
- `validateGanFile(file: File): Promise<ValidationResult>`: Validate a .gan file without full parsing
- `registerFormatParser(format: string, parser: FormatParser): void`: Register custom format parser
- `registerFormatSerializer(format: string, serializer: FormatSerializer): void`: Register custom format serializer

### Types
- `ProjectData` (`src/modules/file-handler/types/index.ts`): Internal project data structure
- `GanFileHeader` (`src/modules/file-handler/types/index.ts`): .gan file header information
- `ValidationResult` (`src/modules/file-handler/types/index.ts`): File validation results

## Data Structures

### ProjectData
```typescript
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  tasks: Task[];
  links: Link[];
  resources?: Resource[];
  assignments?: Assignment[];
  calendars?: CalendarData;
  customFields?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

### Task (subset)
```typescript
export interface Task {
  id: string | number;
  text: string;
  start: Date;
  end: Date;
  duration?: number;
  progress?: number; // 0-100
  type?: 'task' | 'project' | 'milestone';
  parentId?: string | number; // For hierarchical tasks
  notes?: string;
  customFields?: Record<string, any>;
}
```

### Link (Dependency)
```typescript
export interface Link {
  id: string | number;
  source: string | number;
  target: string | number;
  type: 'fs' | 'ss' | 'ff' | 'sf';
  lag?: number; // Time lag in milliseconds
}
```

## Dependencies
- **Internal**:
  - Task Manager Module (for task data conversion)
  - Dependency Manager Module (for link data conversion)
- **External**:
  - DOMParser/SaxJS (for XML parsing)
  - Filesaver.js (for file saving - optional)

## Extension Points

### 1. Additional Format Support
Add support for new file formats by implementing:
- `FormatParser` interface for importing
- `FormatSerializer` interface for exporting
- Registering them with the module

### 2. Custom Field Handlers
Extend the module to handle custom fields specific to certain industries or use cases.

### 3. Pre/Post Processing Hooks
Add hooks that run before/after import/export for data transformation or validation.

### 4. Cloud Storage Integration
Extend to support direct saving/loading from cloud services (Google Drive, Dropbox, etc.).

## Usage Example

```typescript
import { importGanFile, exportGanFile } from '@/modules/file-handler';
// or with path alias
import { importGanFile, exportGanFile } from '@modules/file-handler';

async function handleFileOpen(file: File) {
  try {
    const projectData = await importGanFile(file);
    // Update application state with projectData
    return projectData;
  } catch (error) {
    console.error('Failed to import .gan file:', error);
    throw error;
  }
}

async function handleFileSave(projectData: ProjectData) {
  try {
    const blob = await exportGanFile(projectData);
    // Create download link or save to file system
    return blob;
  } catch (error) {
    console.error('Failed to export .gan file:', error);
    throw error;
  }
}
```

## Implementation Notes

### .gan Format specifics
- Based on GanttProject's XML format
- UTF-8 encoded
- Contains project metadata, tasks, dependencies, resources, calendars, and views
- Follows GanttProject version 3.x schema

### Error Handling
- Provides detailed error messages for parsing failures
- Validates referential integrity (tasks referenced in links exist)
- Checks for circular dependencies during import
- Handles malformed XML gracefully

### Performance
- Uses streaming parsers (SaxJS) for large files to minimize memory usage
- Implements incremental parsing for responsive UI during large imports
- Web worker support available for off-main-thread parsing

### Security
- Validates file types before processing
- Sanitizes input to prevent XXE (XML External Entity) attacks
- Limits file size to prevent DoS attacks

## Related Documentation
- [Architecture Overview](./overview.md)
- [Task Manager Module Guide](./task-manager.md)
- [Dependency Manager Module Guide](./dependency-manager.md)
- [Gantt Chart Module Guide](./gantt-chart.md)
- [Extension Points Guide](../extension-points.md)