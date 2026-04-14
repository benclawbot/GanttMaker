import React, { useState } from 'react';
import { format } from 'date-fns';
import { useProject } from '../store/projectStore';
import type { Resource } from '../types';

export function ResourceView() {
  const { project, addResource, updateResource, deleteResource } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    name: '', type: 'Work', maxUnits: 100
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'];

  const getTaskCountForResource = (resourceId: string) => {
    return project.tasks.filter((t) => t.resources.includes(resourceId)).length;
  };

  const getTasksForResource = (resourceId: string) => {
    return project.tasks.filter((t) => t.resources.includes(resourceId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Resource Sheet</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          <span>+</span>
          <span>Add Resource</span>
        </button>
      </div>

      {/* Add Resource Form */}
      {showAddForm && (
        <div className="mx-4 my-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-semibold text-blue-800 mb-2">New Resource</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Name</label>
              <input
                type="text"
                value={newResource.name || ''}
                onChange={(e) => setNewResource((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                placeholder="Resource name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Type</label>
              <select
                value={newResource.type || 'Work'}
                onChange={(e) => setNewResource((p) => ({ ...p, type: e.target.value as Resource['type'] }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              >
                <option>Work</option>
                <option>Material</option>
                <option>Cost</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Max Units (%)</label>
              <input
                type="number"
                min={0}
                max={200}
                value={newResource.maxUnits ?? 100}
                onChange={(e) => setNewResource((p) => ({ ...p, maxUnits: parseInt(e.target.value) || 100 }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Email</label>
              <input
                type="email"
                value={newResource.email || ''}
                onChange={(e) => setNewResource((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-[10px] text-gray-500 mr-1">Color:</div>
            {COLORS.map((c) => (
              <button
                key={c}
                className={`w-5 h-5 rounded-full border-2 ${newResource.color === c ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewResource((p) => ({ ...p, color: c }))}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (!newResource.name) return;
                const initials = (newResource.name || '').split(' ')
                  .map((w) => w[0]).join('').toUpperCase().substring(0, 2);
                addResource({
                  name: newResource.name!,
                  type: newResource.type || 'Work',
                  initials,
                  email: newResource.email,
                  maxUnits: newResource.maxUnits ?? 100,
                  color: newResource.color || COLORS[project.resources.length % COLORS.length],
                });
                setNewResource({ name: '', type: 'Work', maxUnits: 100 });
                setShowAddForm(false);
              }}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resource Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-8">#</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-48">Resource Name</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-24">Type</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-24">Max Units</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-48">Email</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-20">Tasks</th>
              <th className="text-left px-3 py-2 border-b border-gray-200 font-semibold text-gray-600 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {project.resources.map((resource, idx) => (
              <ResourceRow
                key={resource.id}
                resource={resource}
                idx={idx}
                taskCount={getTaskCountForResource(resource.id)}
                tasks={getTasksForResource(resource.id)}
                isEditing={editingId === resource.id}
                onEdit={() => setEditingId(resource.id)}
                onSave={(updates) => {
                  updateResource(resource.id, updates);
                  setEditingId(null);
                }}
                onDelete={() => {
                  if (window.confirm(`Delete resource "${resource.name}"?`)) {
                    deleteResource(resource.id);
                  }
                }}
                onCancel={() => setEditingId(null)}
                colors={COLORS}
              />
            ))}
          </tbody>
        </table>

        {project.resources.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No resources. Click "Add Resource" to create one.
          </div>
        )}
      </div>

      {/* Resource Usage Summary */}
      {project.resources.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Resource Usage</div>
          <div className="grid grid-cols-2 gap-3">
            {project.resources.map((resource) => {
              const tasks = getTasksForResource(resource.id);
              const avgProgress = tasks.length > 0
                ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length)
                : 0;

              return (
                <div key={resource.id} className="bg-gray-50 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: resource.color || '#6b7280' }}
                    >
                      {resource.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{resource.name}</div>
                      <div className="text-[10px] text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${avgProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{avgProgress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ResourceRowProps {
  resource: Resource;
  idx: number;
  taskCount: number;
  tasks: ReturnType<typeof useProject>['project']['tasks'];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Resource>) => void;
  onDelete: () => void;
  onCancel: () => void;
  colors: string[];
}

function ResourceRow({ resource, idx, taskCount, tasks, isEditing, onEdit, onSave, onDelete, onCancel, colors }: ResourceRowProps) {
  const [editData, setEditData] = useState<Partial<Resource>>({ ...resource });

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-3 py-2 border-b border-gray-100">{idx + 1}</td>
        <td className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {colors.slice(0, 6).map((c) => (
                <button
                  key={c}
                  className={`w-4 h-4 rounded-full border-2 ${editData.color === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEditData((p) => ({ ...p, color: c }))}
                />
              ))}
            </div>
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              autoFocus
              className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-32"
            />
          </div>
        </td>
        <td className="px-3 py-2 border-b border-gray-100">
          <select
            value={editData.type || 'Work'}
            onChange={(e) => setEditData((p) => ({ ...p, type: e.target.value as Resource['type'] }))}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs"
          >
            <option>Work</option>
            <option>Material</option>
            <option>Cost</option>
          </select>
        </td>
        <td className="px-3 py-2 border-b border-gray-100">
          <input
            type="number"
            value={editData.maxUnits ?? 100}
            onChange={(e) => setEditData((p) => ({ ...p, maxUnits: parseInt(e.target.value) || 100 }))}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-16"
          />%
        </td>
        <td className="px-3 py-2 border-b border-gray-100">
          <input
            type="email"
            value={editData.email || ''}
            onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs w-36"
          />
        </td>
        <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{taskCount}</td>
        <td className="px-3 py-2 border-b border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => {
                const initials = (editData.name || '').split(' ')
                  .map((w) => w[0]).join('').toUpperCase().substring(0, 2);
                onSave({ ...editData, initials });
              }}
              className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer group"
      onDoubleClick={onEdit}
    >
      <td className="px-3 py-2 border-b border-gray-100 text-gray-500">{idx + 1}</td>
      <td className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: resource.color || '#6b7280' }}
          >
            {resource.initials}
          </span>
          <div>
            <div className="font-medium text-gray-800">{resource.name}</div>
            {resource.email && <div className="text-[10px] text-gray-400">{resource.email}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{resource.type}</td>
      <td className="px-3 py-2 border-b border-gray-100 text-gray-600">{resource.maxUnits}%</td>
      <td className="px-3 py-2 border-b border-gray-100 text-gray-400">{resource.email || '—'}</td>
      <td className="px-3 py-2 border-b border-gray-100">
        <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {taskCount}
        </span>
      </td>
      <td className="px-3 py-2 border-b border-gray-100">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded hover:bg-gray-300"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded hover:bg-red-200"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}
