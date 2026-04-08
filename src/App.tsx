/**
 * Gantt Chart Maker - Main Application
 * Full integration with TaskContext and File Handler
 */

import React, { useCallback } from 'react';
import './styles/index.css';
import { Toolbar } from './components/ui/Toolbar';
import { GanttChart } from './modules/gantt-chart/components/GanttChart';
import { TaskProvider, useTaskManager } from './context/TaskContext';
import { parseGanString, exportGanFile } from './modules/file-handler';
import type { Task, Link } from './modules/task-manager/types';
import { DependencyType } from './modules/task-manager/types';

// ============================================================================
// Inner App Component (has access to TaskContext)
// ============================================================================

function AppContent() {
  const { state, loadProject, canUndo, canRedo, undo, redo } = useTaskManager();

  // Menu-driven handlers
  const handleNewProject = useCallback(() => {
    if (state.isDirty) {
      const ok = window.confirm('You have unsaved changes. Create a new project anyway?');
      if (!ok) return;
    }
    const defaultTasks: Task[] = [
      { id: '1', text: 'Project Planning', startDate: new Date(), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), type: 'project' },
      { id: '2', text: 'Define requirements', startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), progress: 100 },
      { id: '3', text: 'Design architecture', startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), progress: 75 },
      { id: '4', text: 'Development', startDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), progress: 30 },
    ];
    const defaultLinks: Link[] = [
      { id: '1', source: '2', target: '3', type: DependencyType.FS },
      { id: '2', source: '3', target: '4', type: DependencyType.FS },
    ];
    loadProject({ name: 'New Project', tasks: defaultTasks, links: defaultLinks });
  }, [state.isDirty, loadProject]);

  const handleOpenFile = useCallback(async () => {
    if (state.isDirty) {
      const ok = window.confirm('You have unsaved changes. Open another file anyway?');
      if (!ok) return;
    }
    try {
      const result = await window.electronAPI?.openFileDialog();
      if (!result) return;

      if (result.type === 'gan') {
        const projectData = await parseGanString(result.content);
        loadProject({
          name: projectData.name,
          tasks: projectData.tasks.map((t) => ({
            id: String(t.id),
            text: t.text,
            description: t.description,
            startDate: t.start,
            endDate: t.end,
            duration: t.duration,
            progress: t.progress,
            type: t.type as 'task' | 'project' | 'milestone',
            parentId: t.parentId ? String(t.parentId) : undefined,
            notes: t.notes,
            customFields: t.customFields,
          })),
          links: projectData.links.map((l) => ({
            id: String(l.id),
            source: String(l.source),
            target: String(l.target),
            type: l.type as DependencyType,
            lag: l.lag,
          })),
        });
        alert(`Successfully loaded: ${result.filePath}`);
      } else {
        // .mpp — already parsed by Electron main process
        const data = await window.electronAPI?.readMpp(result.filePath);
        if (!data) return;
        // Convert tsmpp format to GanttMaker internal format
        const pd = data as { name: string; tasks: any[]; finishDate?: string };
        loadProject({
          name: pd.name,
          tasks: pd.tasks.map((t: any) => ({
            id: String(t.id),
            text: t.name,
            description: undefined,
            startDate: new Date(t.startDate),
            endDate: new Date(t.finishDate),
            duration: (t.durationDays ?? 1) * 24 * 60 * 60 * 1000,
            progress: 0,
            type: t.isMilestone ? 'milestone' : t.isSummary ? 'project' : 'task',
            parentId: t.parentId != null ? String(t.parentId) : undefined,
            notes: undefined,
            customFields: undefined,
          })),
          links: pd.tasks.flatMap((t: any) =>
            (t.predecessors ?? []).map((p: any, i: number) => ({
              id: `${t.id}-${p.taskId}-${i}`,
              source: String(p.taskId),
              target: String(t.id),
              type: (p.type ?? 'FS') as DependencyType,
              lag: 0,
            }))
          ),
        });
        alert(`Successfully loaded: ${result.filePath}`);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open file: ' + (error as Error).message);
    }
  }, [state.isDirty, loadProject]);

  const handleSaveFile = useCallback(async (saveAs = false) => {
    const projectData = {
      id: state.id,
      name: state.name,
      tasks: state.tasks.map((t) => ({
        id: t.id,
        text: t.text,
        description: t.description,
        start: t.startDate || new Date(),
        end: t.endDate || new Date(),
        duration: t.duration,
        progress: t.progress,
        type: t.type,
        parentId: t.parentId,
        notes: t.notes,
        customFields: t.customFields,
      })),
      links: state.links.map((l) => ({
        id: l.id,
        source: l.source,
        target: l.target,
        type: l.type,
        lag: l.lag,
      })),
      metadata: { version: '3.3', locale: 'en' },
    };
    const filename = `${state.name.replace(/[^a-z0-9]/gi, '_')}.gan`;
    const blob = exportGanFile(projectData as any);
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });
    try {
      await window.electronAPI?.saveFileDialog(text, 'gan', filename);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + (error as Error).message);
    }
  }, [state]);

  // Wire menu accelerators (Ctrl+N/O/S etc.) and file-association open
  React.useEffect(() => {
    const cleanups: (() => void)[] = [];
    if (window.electronAPI) {
      cleanups.push(window.electronAPI.onMenuNew(handleNewProject));
      cleanups.push(window.electronAPI.onMenuOpen(handleOpenFile));
      cleanups.push(window.electronAPI.onMenuSave(() => handleSaveFile(false)));
      cleanups.push(window.electronAPI.onMenuSaveAs(() => handleSaveFile(true)));
      cleanups.push(window.electronAPI.onMenuUndo(undo));
      cleanups.push(window.electronAPI.onMenuRedo(redo));
      cleanups.push(
        window.electronAPI.onFileOpened(async (filePath: string) => {
          if (state.isDirty) {
            const ok = window.confirm('You have unsaved changes. Open another file anyway?');
            if (!ok) return;
          }
          try {
            const ext = filePath.split('.').pop()?.toLowerCase();
            if (ext === 'gan') {
              const xml = await window.electronAPI!.readGan(filePath);
              const pd = await parseGanString(xml);
              loadProject({ name: pd.name, tasks: pd.tasks as any, links: pd.links as any });
            } else if (ext === 'mpp') {
              const data = await window.electronAPI!.readMpp(filePath);
              const pd = data as { name: string; tasks: any[] };
              loadProject({
                name: pd.name,
                tasks: pd.tasks.map((t: any) => ({ id: String(t.id), text: t.name, startDate: new Date(t.startDate), endDate: new Date(t.finishDate), type: t.isMilestone ? 'milestone' : 'task' })),
                links: [],
              });
            }
          } catch (error) {
            alert('Failed to open file: ' + (error as Error).message);
          }
        })
      );
    }
    return () => cleanups.forEach((fn) => fn());
  }, [handleNewProject, handleOpenFile, handleSaveFile, undo, redo, state.isDirty, loadProject]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm flex-shrink-0">
        <Toolbar
          onNewProject={handleNewProject}
          onOpenFile={handleOpenFile}
          onSaveFile={() => handleSaveFile(false)}
          canSave={state.tasks.length > 0}
          projectName={state.name}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      </header>
      <main className="flex-1 p-4 min-h-0">
        <div className="bg-white rounded-lg shadow h-full overflow-hidden">
          <GanttChart />
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// Main App with Provider
// ============================================================================

function App() {
  const defaultTasks: Task[] = [
    { id: '1', text: 'Project Planning', startDate: new Date(), endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), type: 'project' },
    { id: '2', text: 'Define requirements', startDate: new Date(), endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), progress: 100 },
    { id: '3', text: 'Design architecture', startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), progress: 75 },
    { id: '4', text: 'Development', startDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), progress: 30 },
  ];
  
  const defaultLinks: Link[] = [
    { id: '1', source: '2', target: '3', type: DependencyType.FS },
    { id: '2', source: '3', target: '4', type: DependencyType.FS },
  ];
  
  return (
    <TaskProvider
      initialTasks={defaultTasks}
      initialLinks={defaultLinks}
      initialName="My Gantt Project"
    >
      <AppContent />
    </TaskProvider>
  );
}

export default App;