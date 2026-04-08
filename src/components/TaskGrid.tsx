import React, { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useProject } from '../store/projectStore';
import { getVisibleTasks, hasChildren } from '../store/projectStore';
import type { Task } from '../types';
import { TaskType } from '../types';

interface TaskGridProps {
  tasks: Task[];
  onRowClick: (taskId: string, e: React.MouseEvent) => void;
  editingCell: { taskId: string; field: string } | null;
  onEditCell: (taskId: string, field: string) => void;
  onFinishEdit: () => void;
  rowHeight: number;
}

const COLUMNS = [
  { id: 'id', label: 'ID', width: 40 },
  { id: 'name', label: 'Task Name', width: 220 },
  { id: 'duration', label: 'Duration', width: 72 },
  { id: 'startDate', label: 'Start', width: 90 },
  { id: 'endDate', label: 'Finish', width: 90 },
  { id: 'progress', label: '% Done', width: 60 },
  { id: 'resources', label: 'Resources', width: 110 },
];

export function TaskGrid({ tasks, onRowClick, editingCell, onEditCell, onFinishEdit, rowHeight }: TaskGridProps) {
  const { project, selection, collapsedIds, toggleCollapse, updateTask, addTask } = useProject();
  const editRef = useRef<HTMLInputElement>(null);

  const getResourceNames = (resourceIds: string[]) => {
    return resourceIds
      .map((id) => project.resources.find((r) => r.id === id)?.name || id)
      .join(', ');
  };

  const getCellValue = (task: Task, field: string): string => {
    switch (field) {
      case 'id': return task.wbsCode || task.id;
      case 'name': return task.name;
      case 'duration': return task.isMilestone ? '0d' : `${task.duration}d`;
      case 'startDate': return format(task.startDate, 'MM/dd/yyyy');
      case 'endDate': return format(task.endDate, 'MM/dd/yyyy');
      case 'progress': return `${task.progress}%`;
      case 'resources': return getResourceNames(task.resources);
      default: return '';
    }
  };

  const handleCellEdit = (task: Task, field: string, value: string) => {
    switch (field) {
      case 'name':
        updateTask(task.id, { name: value });
        break;
      case 'duration': {
        const days = parseInt(value) || 0;
        const newEnd = new Date(task.startDate);
        newEnd.setDate(newEnd.getDate() + days);
        updateTask(task.id, { duration: days, endDate: newEnd });
        break;
      }
      case 'progress':
        updateTask(task.id, { progress: Math.min(100, Math.max(0, parseInt(value) || 0)) });
        break;
      case 'startDate': {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const newEnd = new Date(d);
          newEnd.setDate(newEnd.getDate() + task.duration);
          updateTask(task.id, { startDate: d, endDate: newEnd });
        }
        break;
      }
      case 'endDate': {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          updateTask(task.id, { endDate: d });
        }
        break;
      }
    }
  };

  const isEditable = (field: string) => ['name', 'duration', 'startDate', 'endDate', 'progress'].includes(field);

  return (
    <div className="flex flex-col h-full overflow-hidden border-r border-gray-300">
      {/* Header */}
      <div className="flex bg-[#f5f5f5] border-b border-gray-300 sticky top-0 z-10 flex-shrink-0">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 px-2 py-1.5 text-xs font-semibold text-gray-600 border-r border-gray-300 select-none truncate"
            style={{ width: col.width }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {tasks.map((task, rowIdx) => {
          const isSelected = selection.has(task.id);
          const isCollapsed = collapsedIds.has(task.id);
          const taskHasChildren = hasChildren(project.tasks, task.id);
          const isSummary = task.type === TaskType.Summary;
          const isMilestone = task.isMilestone || task.type === TaskType.Milestone;

          return (
            <div
              key={task.id}
              className={`flex border-b border-gray-200 cursor-pointer select-none group
                ${isSelected ? 'bg-blue-100' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                hover:bg-blue-50`}
              style={{ height: rowHeight }}
              onClick={(e) => onRowClick(task.id, e)}
              onDoubleClick={() => onEditCell(task.id, 'name')}
            >
              {COLUMNS.map((col) => {
                const isEditing = editingCell?.taskId === task.id && editingCell?.field === col.id;
                const value = getCellValue(task, col.id);

                return (
                  <div
                    key={col.id}
                    className={`flex-shrink-0 flex items-center border-r border-gray-200 text-xs overflow-hidden relative
                      ${isEditing ? 'p-0' : 'px-1.5'}`}
                    style={{ width: col.width }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isEditable(col.id)) onEditCell(task.id, col.id);
                    }}
                  >
                    {col.id === 'name' ? (
                      <div
                        className="flex items-center gap-1 w-full overflow-hidden"
                        style={{ paddingLeft: task.level * 16 + 4 }}
                      >
                        {/* Collapse/Expand Toggle */}
                        {taskHasChildren ? (
                          <button
                            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(task.id);
                            }}
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                        ) : (
                          <span className="flex-shrink-0 w-4" />
                        )}

                        {/* Task Icon */}
                        <span className="flex-shrink-0 text-xs">
                          {isMilestone ? '◆' : isSummary ? '📁' : '📌'}
                        </span>

                        {/* Task Name */}
                        {isEditing ? (
                          <input
                            ref={editRef}
                            autoFocus
                            defaultValue={task.name}
                            className="flex-1 text-xs border border-blue-400 px-1 outline-none bg-white"
                            style={{ height: rowHeight - 2 }}
                            onBlur={(e) => {
                              handleCellEdit(task, 'name', e.target.value);
                              onFinishEdit();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                handleCellEdit(task, 'name', (e.target as HTMLInputElement).value);
                                onFinishEdit();
                                e.preventDefault();
                              }
                              if (e.key === 'Escape') onFinishEdit();
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className={`truncate flex-1 ${isSummary ? 'font-semibold' : ''} ${isMilestone ? 'font-medium text-purple-800' : ''} ${task.isCritical && project.settings.showCriticalPath ? 'text-red-600' : ''}`}
                            title={task.name}
                          >
                            {task.name}
                          </span>
                        )}
                      </div>
                    ) : isEditing && isEditable(col.id) ? (
                      <input
                        ref={editRef}
                        autoFocus
                        defaultValue={value}
                        className="w-full text-xs border border-blue-400 px-1 outline-none bg-white h-full"
                        onBlur={(e) => {
                          handleCellEdit(task, col.id, e.target.value);
                          onFinishEdit();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellEdit(task, col.id, (e.target as HTMLInputElement).value);
                            onFinishEdit();
                          }
                          if (e.key === 'Escape') onFinishEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : col.id === 'progress' ? (
                      <div className="flex items-center gap-1 w-full">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-600 text-[10px] flex-shrink-0">{task.progress}%</span>
                      </div>
                    ) : col.id === 'resources' ? (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {task.resources.slice(0, 2).map((rid) => {
                          const res = project.resources.find((r) => r.id === rid);
                          return res ? (
                            <span
                              key={rid}
                              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: res.color || '#6b7280' }}
                              title={res.name}
                            >
                              {res.initials}
                            </span>
                          ) : null;
                        })}
                        {task.resources.length > 2 && (
                          <span className="text-gray-500 text-[10px]">+{task.resources.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className={`truncate ${isSummary && col.id === 'startDate' || isSummary && col.id === 'endDate' ? 'font-medium' : ''}`}>
                        {value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Empty state / Add task row */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            No tasks. Click + to add a task.
          </div>
        )}

        {/* Add row button */}
        <div
          className="flex items-center px-3 py-2 border-b border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 cursor-pointer text-xs gap-1"
          onClick={() => addTask()}
        >
          <span>➕</span>
          <span>Click here to add a task</span>
        </div>
      </div>
    </div>
  );
}
