import React, { useState } from 'react';
import { useProject } from '../store/projectStore';

interface RibbonTab {
  id: string;
  label: string;
}

const TABS: RibbonTab[] = [
  { id: 'task', label: 'Task' },
  { id: 'resource', label: 'Resource' },
  { id: 'view', label: 'View' },
  { id: 'format', label: 'Format' },
];

interface RibbonButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  size?: 'large' | 'small';
}

function RibbonButton({ icon, label, onClick, disabled, active, title, size = 'small' }: RibbonButtonProps) {
  if (size === 'large') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title || label}
        className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded text-[11px] min-w-[48px] transition-colors
          ${disabled ? 'text-gray-400 cursor-not-allowed' : active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}
      >
        <span className="text-xl">{icon}</span>
        <span className="leading-tight text-center">{label}</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors
        ${disabled ? 'text-gray-400 cursor-not-allowed' : active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Separator() {
  return <div className="w-px h-12 bg-gray-200 mx-1" />;
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-0.5 flex-1 px-1 py-1">
        {children}
      </div>
      <div className="text-[10px] text-center text-gray-400 border-t border-gray-200 px-2 py-0.5">
        {label}
      </div>
    </div>
  );
}

export function Ribbon() {
  const [activeTab, setActiveTab] = useState('task');
  const {
    project, view, setView, selection, deleteSelectedTasks,
    addTask, indentTask, outdentTask, moveTaskUp, moveTaskDown,
    openFile, saveFile, exportAs, updateSettings,
  } = useProject();

  const selectedId = selection.size === 1 ? Array.from(selection)[0] : undefined;

  return (
    <div className="bg-white border-b border-gray-300 select-none">
      {/* Title Bar */}
      <div className="flex items-center px-4 py-1 bg-[#2b579a] text-white gap-4">
        {/* Project Logo */}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="4" height="18" rx="1" />
            <rect x="9" y="3" width="12" height="6" rx="1" />
            <rect x="9" y="11" width="9" height="4" rx="1" />
          </svg>
          <span className="font-bold text-sm tracking-wide">MS Project Clone</span>
        </div>
        
        {/* Quick Access Toolbar */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={saveFile}
            title="Save (Ctrl+S)"
            className="p-1 hover:bg-white/20 rounded text-white/90"
          >
            💾
          </button>
          <button
            onClick={openFile}
            title="Open file"
            className="p-1 hover:bg-white/20 rounded text-white/90"
          >
            📂
          </button>
          <button
            onClick={() => addTask(undefined, selectedId)}
            title="New task"
            className="p-1 hover:bg-white/20 rounded text-white/90"
          >
            ➕
          </button>
        </div>

        <div className="flex-1" />

        {/* Project Name */}
        <div className="text-sm font-medium opacity-90 truncate max-w-xs">
          {project.name}
          {project.isDirty && <span className="text-yellow-300 ml-1">●</span>}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-end px-2 bg-[#2b579a]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm rounded-t-sm transition-colors
              ${activeTab === tab.id
                ? 'bg-white text-gray-800 font-medium'
                : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ribbon Content */}
      <div className="flex items-stretch gap-0 border-b border-gray-200 bg-gray-50 min-h-[64px]">
        {activeTab === 'task' && (
          <>
            <RibbonGroup label="Clipboard">
              <RibbonButton
                size="large"
                icon="📋"
                label="Paste"
                title="Paste (Ctrl+V)"
              />
              <div className="flex flex-col gap-0.5">
                <RibbonButton icon="✂️" label="Cut" title="Cut (Ctrl+X)" />
                <RibbonButton icon="📄" label="Copy" title="Copy (Ctrl+C)" />
              </div>
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Insert">
              <RibbonButton
                size="large"
                icon="📝"
                label="Task"
                onClick={() => addTask(undefined, selectedId)}
                title="Insert new task"
              />
              <div className="flex flex-col gap-0.5">
                <RibbonButton
                  icon="◇"
                  label="Milestone"
                  onClick={() => {
                    if (!selectedId) return;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                  }}
                  title="Insert milestone"
                />
                <RibbonButton
                  icon="📁"
                  label="Summary"
                  title="Insert summary task"
                />
              </div>
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Properties">
              <RibbonButton
                size="large"
                icon="🗑️"
                label="Delete"
                onClick={deleteSelectedTasks}
                disabled={selection.size === 0}
                title="Delete selected task(s)"
              />
              <div className="flex flex-col gap-0.5">
                <RibbonButton
                  icon="↩"
                  label="Indent"
                  onClick={() => selectedId && indentTask(selectedId)}
                  disabled={!selectedId}
                  title="Indent task"
                />
                <RibbonButton
                  icon="↪"
                  label="Outdent"
                  onClick={() => selectedId && outdentTask(selectedId)}
                  disabled={!selectedId}
                  title="Outdent task"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <RibbonButton
                  icon="↑"
                  label="Move Up"
                  onClick={() => selectedId && moveTaskUp(selectedId)}
                  disabled={!selectedId}
                />
                <RibbonButton
                  icon="↓"
                  label="Move Down"
                  onClick={() => selectedId && moveTaskDown(selectedId)}
                  disabled={!selectedId}
                />
              </div>
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Schedule">
              <div className="flex flex-col gap-0.5">
                <RibbonButton icon="🔗" label="Link Tasks" title="Link selected tasks (Ctrl+F2)" />
                <RibbonButton icon="🔓" label="Unlink" title="Remove dependencies" />
              </div>
              <div className="flex flex-col gap-0.5">
                <RibbonButton
                  icon="✅"
                  label="Mark Complete"
                  onClick={() => {
                    if (selectedId) {
                      // markComplete
                    }
                  }}
                  disabled={!selectedId}
                />
                <RibbonButton icon="📊" label="0% → 100%" />
              </div>
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Editing">
              <RibbonButton icon="🔍" label="Find" title="Find task (Ctrl+F)" size="large" />
              <div className="flex flex-col gap-0.5">
                <RibbonButton icon="↕️" label="Scroll to" title="Scroll to task" />
                <RibbonButton icon="🎯" label="Go to" />
              </div>
            </RibbonGroup>
          </>
        )}

        {activeTab === 'resource' && (
          <>
            <RibbonGroup label="View">
              <RibbonButton
                size="large"
                icon="👥"
                label="Resources"
                onClick={() => setView('resources')}
                active={view === 'resources'}
              />
            </RibbonGroup>
            <Separator />
            <RibbonGroup label="Insert">
              <RibbonButton size="large" icon="👤" label="Add Resource" />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'view' && (
          <>
            <RibbonGroup label="Task Views">
              <RibbonButton
                size="large"
                icon="📊"
                label="Gantt Chart"
                onClick={() => setView('gantt')}
                active={view === 'gantt'}
              />
              <RibbonButton
                size="large"
                icon="📋"
                label="Task Sheet"
                onClick={() => setView('tasks')}
                active={view === 'tasks'}
              />
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Zoom">
              {(['days', 'weeks', 'months', 'quarters', 'years'] as const).map((z) => (
                <RibbonButton
                  key={z}
                  icon=""
                  label={z.charAt(0).toUpperCase() + z.slice(1)}
                  active={project.settings.zoomLevel === z}
                  onClick={() => updateSettings({ zoomLevel: z })}
                />
              ))}
            </RibbonGroup>

            <Separator />

            <RibbonGroup label="Show/Hide">
              <div className="flex flex-col gap-0.5 pt-1">
                <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer hover:bg-gray-100 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={project.settings.showCriticalPath}
                    onChange={(e) => updateSettings({ showCriticalPath: e.target.checked })}
                    className="w-3 h-3"
                  />
                  Critical Path
                </label>
                <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer hover:bg-gray-100 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={project.settings.showDependencies}
                    onChange={(e) => updateSettings({ showDependencies: e.target.checked })}
                    className="w-3 h-3"
                  />
                  Dependencies
                </label>
                <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer hover:bg-gray-100 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={project.settings.showProgress}
                    onChange={(e) => updateSettings({ showProgress: e.target.checked })}
                    className="w-3 h-3"
                  />
                  Progress
                </label>
                <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer hover:bg-gray-100 px-1 rounded">
                  <input
                    type="checkbox"
                    checked={project.settings.showWeekends}
                    onChange={(e) => updateSettings({ showWeekends: e.target.checked })}
                    className="w-3 h-3"
                  />
                  Weekends
                </label>
              </div>
            </RibbonGroup>
          </>
        )}

        {activeTab === 'format' && (
          <>
            <RibbonGroup label="File">
              <RibbonButton size="large" icon="📂" label="Open" onClick={openFile} />
              <RibbonButton size="large" icon="💾" label="Save .gan" onClick={saveFile} />
              <div className="flex flex-col gap-0.5">
                <RibbonButton icon="📤" label="Export CSV" onClick={() => exportAs('csv')} />
                <RibbonButton icon="🖨️" label="Print" onClick={() => window.print()} />
              </div>
            </RibbonGroup>
          </>
        )}
      </div>
    </div>
  );
}
