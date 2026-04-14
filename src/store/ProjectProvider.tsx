import React, { useState, useCallback, useMemo } from 'react';
import type { Project, Task, Dependency, Resource, ProjectSettings } from '../types';
import { TaskType, DependencyType } from '../types';
import {
  ProjectContext,
  createDefaultProject,
  generateId,
  getDescendants,
  recalculateSummaryDates,
  getChildren,
} from './projectStore';
import type { ProjectContextType } from './projectStore';
import { parseGanFile } from '../parsers/ganParser';
import { parseMppFile, parseMspXmlFile } from '../parsers/mppParser';
import { exportToGan, exportToCsv, downloadFile } from '../parsers/ganExporter';
import { addDays } from 'date-fns';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(createDefaultProject);
  const [view, setView] = useState<string>('gantt');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // ============================================================================
  // Selection
  // ============================================================================

  const selectTask = useCallback((id: string, multi: boolean, range: boolean) => {
    setSelectedDependencyId(null);
    setSelection((prev) => {
      if (range && lastSelectedId) {
        // Range select: select all tasks between lastSelectedId and id
        const taskIds = project.tasks.map((t) => t.id);
        const fromIdx = taskIds.indexOf(lastSelectedId);
        const toIdx = taskIds.indexOf(id);
        if (fromIdx !== -1 && toIdx !== -1) {
          const start = Math.min(fromIdx, toIdx);
          const end = Math.max(fromIdx, toIdx);
          const rangeIds = new Set(prev);
          taskIds.slice(start, end + 1).forEach((tid) => rangeIds.add(tid));
          return rangeIds;
        }
      }
      if (multi) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
    setLastSelectedId(id);
  }, [lastSelectedId, project.tasks]);

  const clearSelection = useCallback(() => {
    setSelection(new Set());
    setSelectedDependencyId(null);
  }, []);

  const selectDependency = useCallback((id: string | null) => {
    setSelectedDependencyId(id);
    setSelection(new Set());
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ============================================================================
  // Task Operations
  // ============================================================================

  const addTask = useCallback((parentId?: string, afterId?: string) => {
    setProject((prev) => {
      const tasks = [...prev.tasks];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Determine insert position
      let insertIdx = tasks.length;
      if (afterId) {
        const afterIdx = tasks.findIndex((t) => t.id === afterId);
        if (afterIdx !== -1) {
          // Insert after all descendants of afterId
          let endIdx = afterIdx;
          for (let i = afterIdx + 1; i < tasks.length; i++) {
            if (!isDescendantOf(tasks, tasks[i].id, afterId)) break;
            endIdx = i;
          }
          insertIdx = endIdx + 1;
        }
      }

      const level = parentId ? (tasks.find((t) => t.id === parentId)?.level ?? 0) + 1 : 0;
      const newTask: Task = {
        id: generateId(),
        name: 'New Task',
        type: TaskType.Task,
        parentId,
        level,
        order: insertIdx,
        startDate: today,
        endDate: addDays(today, 5),
        duration: 5,
        progress: 0,
        priority: 'Normal',
        isMilestone: false,
        isCritical: false,
        isCollapsed: false,
        resources: [],
      };

      tasks.splice(insertIdx, 0, newTask);

      // Reorder
      tasks.forEach((t, i) => { t.order = i; });

      // Update parent to summary if needed
      if (parentId) {
        const parent = tasks.find((t) => t.id === parentId);
        if (parent && parent.type === TaskType.Task) {
          parent.type = TaskType.Summary;
        }
      }

      return { ...prev, tasks: recalculateSummaryDates(tasks), isDirty: true };
    });
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setProject((prev) => {
      const tasks = prev.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      return { ...prev, tasks: recalculateSummaryDates(tasks), isDirty: true };
    });
  }, []);

  const deleteSelectedTasks = useCallback(() => {
    if (selection.size === 0) return;
    setProject((prev) => {
      const toDelete = new Set<string>();
      selection.forEach((id) => {
        toDelete.add(id);
        getDescendants(prev.tasks, id).forEach((d) => toDelete.add(d.id));
      });

      const tasks = prev.tasks.filter((t) => !toDelete.has(t.id));
      const dependencies = prev.dependencies.filter(
        (d) => !toDelete.has(d.fromTaskId) && !toDelete.has(d.toTaskId)
      );

      return { ...prev, tasks, dependencies, isDirty: true };
    });
    setSelection(new Set());
  }, [selection]);

  const indentTask = useCallback((id: string) => {
    setProject((prev) => {
      const tasks = [...prev.tasks];
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx <= 0) return prev;

      // Find the task above it at the same or lower level
      const task = tasks[idx];
      const prevTask = tasks[idx - 1];

      if (prevTask.level < task.level) return prev; // Already indented enough

      // Make prevTask the parent
      task.parentId = prevTask.id;
      task.level = prevTask.level + 1;

      // Update type of new parent
      if (prevTask.type === TaskType.Task) prevTask.type = TaskType.Summary;

      // Update descendants level
      const descendants = getDescendants(tasks, id);
      descendants.forEach((d) => { d.level = (tasks.find((t) => t.id === d.parentId)?.level ?? 0) + 1; });

      return { ...prev, tasks: recalculateSummaryDates([...tasks]), isDirty: true };
    });
  }, []);

  const outdentTask = useCallback((id: string) => {
    setProject((prev) => {
      const tasks = [...prev.tasks];
      const task = tasks.find((t) => t.id === id);
      if (!task?.parentId) return prev;

      const parent = tasks.find((t) => t.id === task.parentId);
      if (!parent) return prev;

      task.parentId = parent.parentId;
      task.level = parent.level;

      // Recalculate descendants
      const descendants = getDescendants(tasks, id);
      descendants.forEach((d) => { d.level = (tasks.find((t) => t.id === d.parentId)?.level ?? 0) + 1; });

      // Check if parent still has children
      const siblingChildren = tasks.filter((t) => t.parentId === parent.id && t.id !== id);
      if (siblingChildren.length === 0) parent.type = TaskType.Task;

      return { ...prev, tasks: recalculateSummaryDates([...tasks]), isDirty: true };
    });
  }, []);

  const moveTaskUp = useCallback((id: string) => {
    setProject((prev) => {
      const tasks = [...prev.tasks];
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx <= 0) return prev;

      const task = tasks[idx];
      // Find the previous sibling
      const prevSiblingIdx = tasks.slice(0, idx).reverse().findIndex(
        (t) => t.parentId === task.parentId
      );

      if (prevSiblingIdx === -1) return prev;
      const actualIdx = idx - 1 - prevSiblingIdx;

      // Swap
      [tasks[idx], tasks[actualIdx]] = [tasks[actualIdx], tasks[idx]];
      tasks.forEach((t, i) => { t.order = i; });

      return { ...prev, tasks, isDirty: true };
    });
  }, []);

  const moveTaskDown = useCallback((id: string) => {
    setProject((prev) => {
      const tasks = [...prev.tasks];
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx >= tasks.length - 1) return prev;

      const task = tasks[idx];
      const nextSiblingIdx = tasks.slice(idx + 1).findIndex(
        (t) => t.parentId === task.parentId
      );

      if (nextSiblingIdx === -1) return prev;
      const actualIdx = idx + 1 + nextSiblingIdx;

      [tasks[idx], tasks[actualIdx]] = [tasks[actualIdx], tasks[idx]];
      tasks.forEach((t, i) => { t.order = i; });

      return { ...prev, tasks, isDirty: true };
    });
  }, []);

  // ============================================================================
  // Dependency Operations
  // ============================================================================

  const addDependency = useCallback((dep: Omit<Dependency, 'id'>) => {
    setProject((prev) => {
      // Prevent duplicate dependencies
      const exists = prev.dependencies.some(
        (d) => d.fromTaskId === dep.fromTaskId && d.toTaskId === dep.toTaskId
      );
      if (exists) return prev;

      const newDep: Dependency = { ...dep, id: generateId() };
      return { ...prev, dependencies: [...prev.dependencies, newDep], isDirty: true };
    });
  }, []);

  const deleteDependency = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((d) => d.id !== id),
      isDirty: true,
    }));
    setSelectedDependencyId(null);
  }, []);

  // ============================================================================
  // Resource Operations
  // ============================================================================

  const addResource = useCallback((resource: Omit<Resource, 'id'>) => {
    setProject((prev) => ({
      ...prev,
      resources: [...prev.resources, { ...resource, id: generateId() }],
      isDirty: true,
    }));
  }, []);

  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    setProject((prev) => ({
      ...prev,
      resources: prev.resources.map((r) => r.id === id ? { ...r, ...updates } : r),
      isDirty: true,
    }));
  }, []);

  const deleteResource = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== id),
      tasks: prev.tasks.map((t) => ({ ...t, resources: t.resources.filter((rid) => rid !== id) })),
      assignments: prev.assignments.filter((a) => a.resourceId !== id),
      isDirty: true,
    }));
  }, []);

  // ============================================================================
  // Project Operations
  // ============================================================================

  const loadProject = useCallback((p: Project) => {
    setProject(p);
    setCollapsedIds(new Set());
    setSelection(new Set());
    setSelectedDependencyId(null);
  }, []);

  const newProject = useCallback(() => {
    const newProj = { ...createDefaultProject(), isDirty: false };
    setProject(newProj);
    setCollapsedIds(new Set());
    setSelection(new Set());
    setSelectedDependencyId(null);
  }, []);

  const updateProjectName = useCallback((name: string) => {
    setProject((prev) => ({ ...prev, name, isDirty: true }));
  }, []);

  const updateSettings = useCallback((settings: Partial<ProjectSettings>) => {
    setProject((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
      isDirty: true,
    }));
  }, []);

  // ============================================================================
  // File Operations
  // ============================================================================

  const openFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gan,.mpp,.xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        let result;
        if (file.name.toLowerCase().endsWith('.gan')) {
          result = await parseGanFile(file);
        } else if (file.name.toLowerCase().endsWith('.mpp')) {
          result = await parseMppFile(file);
        } else if (file.name.toLowerCase().endsWith('.xml')) {
          result = await parseMspXmlFile(file);
        } else {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        loadProject(result.project);

        if (result.warnings.length > 0) {
          console.warn('Import warnings:', result.warnings);
          alert(`File imported with ${result.warnings.length} warning(s):\n\n${result.warnings.slice(0, 3).join('\n')}`);
        }
      } catch (err) {
        alert(`Failed to import file:\n${(err as Error).message}`);
        console.error(err);
      }
    };
    input.click();
  }, [loadProject]);

  const saveFile = useCallback(() => {
    const xml = exportToGan(project);
    const filename = `${project.name.replace(/[^a-z0-9\-_\s]/gi, '_')}.gan`;
    downloadFile(xml, filename, 'application/xml');
    setProject((prev) => ({ ...prev, isDirty: false }));
  }, [project]);

  const exportAs = useCallback((format: string) => {
    if (format === 'csv') {
      const csv = exportToCsv(project);
      const filename = `${project.name.replace(/[^a-z0-9\-_\s]/gi, '_')}.csv`;
      downloadFile(csv, filename, 'text/csv');
    } else if (format === 'gan') {
      saveFile();
    }
  }, [project, saveFile]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const ctx: ProjectContextType = useMemo(() => ({
    project,
    view,
    setView,
    collapsedIds,
    toggleCollapse,
    selection,
    selectTask,
    clearSelection,
    selectedDependencyId,
    selectDependency,
    addTask,
    updateTask,
    deleteSelectedTasks,
    indentTask,
    outdentTask,
    moveTaskUp,
    moveTaskDown,
    addDependency,
    deleteDependency,
    addResource,
    updateResource,
    deleteResource,
    loadProject,
    updateProjectName,
    updateSettings,
    openFile,
    saveFile,
    exportAs,
  }), [
    project, view, collapsedIds, toggleCollapse, selection, selectTask,
    clearSelection, selectedDependencyId, selectDependency,
    addTask, updateTask, deleteSelectedTasks, indentTask, outdentTask,
    moveTaskUp, moveTaskDown, addDependency, deleteDependency,
    addResource, updateResource, deleteResource,
    loadProject, newProject, updateProjectName, updateSettings,
    openFile, saveFile, exportAs,
  ]);

  return (
    <ProjectContext.Provider value={ctx}>
      {children}
    </ProjectContext.Provider>
  );
}

// Helper: is taskId a descendant of ancestorId?
function isDescendantOf(tasks: Task[], taskId: string, ancestorId: string): boolean {
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.parentId) return false;
  if (task.parentId === ancestorId) return true;
  return isDescendantOf(tasks, task.parentId, ancestorId);
}




