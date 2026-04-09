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
  const { view, project, openFile, saveFile, importReport, clearImportReport } = useProject();

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

      {importReport && (
        <ImportReportModal
          report={importReport}
          onClose={clearImportReport}
        />
      )}
    </div>
  );
}

function ImportReportModal({
  report,
  onClose,
}: {
  report: {
    fileName: string;
    format: 'gan' | 'mpp' | 'xml';
    tasks: number;
    dependencies: number;
    resources: number;
    assignments: number;
    warnings: string[];
    compatibilityNote?: string;
  };
  onClose: () => void;
}) {
  const reportText = [
    'Import report',
    '',
    `File: ${report.fileName}`,
    `Format: ${report.format.toUpperCase()}`,
    '',
    `Tasks: ${report.tasks}`,
    `Dependencies: ${report.dependencies}`,
    `Resources: ${report.resources}`,
    `Assignments: ${report.assignments}`,
    '',
    ...(report.warnings.length > 0 ? ['Warnings:', ...report.warnings.map((w) => `- ${w}`), ''] : []),
    ...(report.compatibilityNote ? ['Compatibility note:', report.compatibilityNote] : []),
  ].join('\n');

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
    } catch {
      // no-op
    }
  };

  const downloadReport = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.fileName.replace(/\.[^.]+$/, '')}-import-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="font-semibold text-sm">Import Compatibility Report</div>
          <button className="text-gray-500 hover:text-gray-700 text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 text-sm text-gray-700 space-y-2 max-h-[60vh] overflow-auto">
          <div><span className="text-gray-500">File:</span> {report.fileName}</div>
          <div><span className="text-gray-500">Format:</span> {report.format.toUpperCase()}</div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>Tasks: <span className="font-medium">{report.tasks}</span></div>
            <div>Dependencies: <span className="font-medium">{report.dependencies}</span></div>
            <div>Resources: <span className="font-medium">{report.resources}</span></div>
            <div>Assignments: <span className="font-medium">{report.assignments}</span></div>
          </div>

          {report.warnings.length > 0 && (
            <div className="pt-2">
              <div className="font-medium text-amber-700">Warnings ({report.warnings.length})</div>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-amber-800">
                {report.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {report.compatibilityNote && (
            <div className="pt-2 text-gray-600">
              <span className="font-medium">Compatibility note:</span> {report.compatibilityNote}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button onClick={copyReport} className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50">Copy report</button>
          <button onClick={downloadReport} className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50">Download .txt</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Close</button>
        </div>
      </div>
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


