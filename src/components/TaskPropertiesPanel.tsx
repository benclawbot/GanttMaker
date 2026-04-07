import React, { useState } from 'react';
import { format } from 'date-fns';
import { useProject } from '../store/projectStore';
import type { Task } from '../types';
import { TaskType, DependencyType } from '../types';

export function TaskPropertiesPanel() {
  const { project, selection, updateTask, addDependency, deleteDependency } = useProject();
  const [activeTab, setActiveTab] = useState<'general' | 'resources' | 'notes' | 'dependencies'>('general');

  const selectedId = selection.size === 1 ? Array.from(selection)[0] : null;
  const task = selectedId ? project.tasks.find((t) => t.id === selectedId) : null;

  if (!task) {
    return (
      <div className="w-64 border-l border-gray-300 bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm p-4">
          <div className="text-3xl mb-2">📋</div>
          <div>Select a task to view properties</div>
        </div>
      </div>
    );
  }

  const taskDeps = project.dependencies.filter(
    (d) => d.fromTaskId === task.id || d.toTaskId === task.id
  );

  return (
    <div className="w-64 border-l border-gray-300 bg-white flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-3 py-2 bg-[#2b579a] text-white flex-shrink-0">
        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Task Properties</div>
        <div className="font-semibold text-sm truncate mt-0.5" title={task.name}>
          {task.name}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {(['general', 'resources', 'dependencies', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-medium capitalize transition-colors
              ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="p-3 space-y-3">
            <Field label="Name">
              <input
                type="text"
                value={task.name}
                onChange={(e) => updateTask(task.id, { name: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="Type">
              <select
                value={task.type}
                onChange={(e) => updateTask(task.id, { type: e.target.value as TaskType })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value={TaskType.Task}>Task</option>
                <option value={TaskType.Summary}>Summary</option>
                <option value={TaskType.Milestone}>Milestone</option>
              </select>
            </Field>

            <Field label="WBS Code">
              <input
                type="text"
                value={task.wbsCode || ''}
                onChange={(e) => updateTask(task.id, { wbsCode: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="Start Date">
              <input
                type="date"
                value={format(task.startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(d.getTime())) updateTask(task.id, { startDate: d });
                }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                value={format(task.endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(d.getTime())) updateTask(task.id, { endDate: d });
                }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="Duration (days)">
              <input
                type="number"
                min={0}
                value={task.duration}
                onChange={(e) => {
                  const days = Math.max(0, parseInt(e.target.value) || 0);
                  const newEnd = new Date(task.startDate);
                  newEnd.setDate(newEnd.getDate() + days);
                  updateTask(task.id, { duration: days, endDate: newEnd });
                }}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label="Progress (%)">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={task.progress}
                  onChange={(e) => updateTask(task.id, { progress: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs font-medium w-8 text-right">{task.progress}%</span>
              </div>
            </Field>

            <Field label="Priority">
              <select
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value as Task['priority'] })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
              >
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </Field>

            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.isCritical}
                  onChange={(e) => updateTask(task.id, { isCritical: e.target.checked })}
                  className="w-3 h-3"
                />
                Critical
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.isMilestone}
                  onChange={(e) => updateTask(task.id, {
                    isMilestone: e.target.checked,
                    type: e.target.checked ? TaskType.Milestone : TaskType.Task,
                  })}
                  className="w-3 h-3"
                />
                Milestone
              </label>
            </div>

            <Field label="Color">
              <div className="flex gap-1 flex-wrap">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'].map((c) => (
                  <button
                    key={c}
                    className={`w-5 h-5 rounded border-2 ${task.color === c ? 'border-gray-800' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => updateTask(task.id, { color: c })}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned Resources</div>
            {project.resources.map((resource) => {
              const isAssigned = task.resources.includes(resource.id);
              return (
                <label
                  key={resource.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={(e) => {
                      const newResources = e.target.checked
                        ? [...task.resources, resource.id]
                        : task.resources.filter((r) => r !== resource.id);
                      updateTask(task.id, { resources: newResources });
                    }}
                    className="w-3 h-3"
                  />
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: resource.color || '#6b7280' }}
                  >
                    {resource.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{resource.name}</div>
                    <div className="text-[10px] text-gray-400">{resource.type}</div>
                  </div>
                </label>
              );
            })}
            {project.resources.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">
                No resources defined. Add resources in the Resource view.
              </div>
            )}
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Dependencies</div>
            {taskDeps.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">No dependencies</div>
            )}
            {taskDeps.map((dep) => {
              const isFrom = dep.fromTaskId === task.id;
              const otherTaskId = isFrom ? dep.toTaskId : dep.fromTaskId;
              const otherTask = project.tasks.find((t) => t.id === otherTaskId);
              return (
                <div key={dep.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {isFrom ? '→' : '←'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{otherTask?.name || otherTaskId}</div>
                    <div className="text-[10px] text-blue-600">{dep.type}{dep.lag !== 0 ? ` (${dep.lag > 0 ? '+' : ''}${dep.lag}d)` : ''}</div>
                  </div>
                  <button
                    onClick={() => deleteDependency(dep.id)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs"
                    title="Remove dependency"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-[10px] text-gray-500 mb-1">Add dependency:</div>
              <AddDepForm taskId={task.id} tasks={project.tasks} onAdd={addDependency} />
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Notes</div>
            <textarea
              value={task.notes || ''}
              onChange={(e) => updateTask(task.id, { notes: e.target.value })}
              className="w-full h-40 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Add notes about this task..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function AddDepForm({ taskId, tasks, onAdd }: {
  taskId: string;
  tasks: Task[];
  onAdd: (dep: { fromTaskId: string; toTaskId: string; type: DependencyType; lag: number }) => void;
}) {
  const [toId, setToId] = useState('');
  const [type, setType] = useState<DependencyType>(DependencyType.FS);
  const [lag, setLag] = useState(0);

  const otherTasks = tasks.filter((t) => t.id !== taskId);

  return (
    <div className="space-y-1.5">
      <select
        value={toId}
        onChange={(e) => setToId(e.target.value)}
        className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs"
      >
        <option value="">Select task...</option>
        {otherTasks.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <div className="flex gap-1">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DependencyType)}
          className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs"
        >
          <option value={DependencyType.FS}>FS</option>
          <option value={DependencyType.SS}>SS</option>
          <option value={DependencyType.FF}>FF</option>
          <option value={DependencyType.SF}>SF</option>
        </select>
        <input
          type="number"
          value={lag}
          onChange={(e) => setLag(parseInt(e.target.value) || 0)}
          placeholder="Lag"
          className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs"
        />
      </div>
      <button
        disabled={!toId}
        onClick={() => {
          if (toId) {
            onAdd({ fromTaskId: taskId, toTaskId: toId, type, lag });
            setToId('');
            setLag(0);
          }
        }}
        className="w-full bg-blue-600 text-white rounded px-2 py-1 text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Dependency
      </button>
    </div>
  );
}
