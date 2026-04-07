/**
 * Gantt Chart Maker - Main Application
 * Full integration with TaskContext and File Handler
 */

import React, { useCallback } from 'react';
import './styles/index.css';
import { Toolbar } from './components/ui/Toolbar';
import { GanttChart } from './modules/gantt-chart/components/GanttChart';
import { TaskProvider, useTaskManager } from './context/TaskContext';
import { importGanFile, downloadGanFile } from './modules/file-handler';
import type { Task, Link } from './modules/task-manager/types';
import { DependencyType } from './modules/task-manager/types';

// ============================================================================
// Inner App Component (has access to TaskContext)
// ============================================================================

function AppContent() {
  const { state, loadProject, resetProject, canUndo, canRedo, undo, redo } = useTaskManager();
  
  // Handle New Project
  const handleNewProject = useCallback(() => {
    if (state.isDirty) {
      const confirm = window.confirm('You have unsaved changes. Create a new project anyway?');
      if (!confirm) return;
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
  
  // Handle Open File
  const handleOpenFile = useCallback(async () => {
    if (state.isDirty) {
      const confirm = window.confirm('You have unsaved changes. Open another file anyway?');
      if (!confirm) return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gan';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const projectData = await importGanFile(file);
        
        // Convert to internal Task format
        const tasks: Task[] = projectData.tasks.map((t) => ({
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
        }));
        
        // Convert to internal Link format
        const links: Link[] = projectData.links.map((l) => ({
          id: String(l.id),
          source: String(l.source),
          target: String(l.target),
          type: l.type as DependencyType,
          lag: l.lag,
        }));
        
        loadProject({ name: projectData.name, tasks, links });
        alert(`Successfully loaded: ${projectData.name}`);
      } catch (error) {
        console.error('Failed to open file:', error);
        alert('Failed to open file: ' + (error as Error).message);
      }
    };
    input.click();
  }, [state.isDirty, loadProject]);
  
  // Handle Save File
  const handleSaveFile = useCallback(() => {
    // Prepare data for export
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
    downloadGanFile(projectData, filename);
  }, [state]);
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm flex-shrink-0">
        <Toolbar
          onNewProject={handleNewProject}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
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