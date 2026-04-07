import React, { useEffect } from 'react';
import './styles/index.css';
import { ProjectProvider } from './store/ProjectProvider';
import { useProject } from './store/projectStore';
import { Ribbon } from './components/Ribbon';
import { GanttView } from './components/GanttView';
import { ResourceView } from './components/ResourceView';
import { TaskPropertiesPanel } from './components/TaskPropertiesPanel';
import { StatusBar } from './components/StatusBar';

function AppContent() {
  const { view, project, openFile, saveFile } = useProject();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            saveFile();
            break;
          case 'o':
            e.preventDefault();
            openFile();
            break;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openFile, saveFile]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white font-sans">
      {/* Ribbon / Toolbar */}
      <Ribbon />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {view === 'gantt' || view === 'tasks' ? (
          <>
            {/* Left: Gantt View (split pane) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <GanttView />
            </div>

            {/* Right: Properties Panel */}
            <TaskPropertiesPanel />
          </>
        ) : view === 'resources' ? (
          <div className="flex-1 overflow-hidden">
            <ResourceView />
          </div>
        ) : null}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
