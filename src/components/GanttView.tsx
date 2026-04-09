import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useProject, getVisibleTasks } from '../store/projectStore';
import { TaskGrid } from './TaskGrid';
import { GanttChart } from './GanttChart';

const DIVIDER_MIN = 280;
const DIVIDER_MAX = 800;
const DIVIDER_DEFAULT = 420;

export function GanttView() {
  const { project, selection, selectTask, clearSelection, deleteSelectedTasks, addTask,
    indentTask, outdentTask, selectedDependencyId, deleteDependency, collapsedIds,
    foldOneLevel, unfoldOneLevel } = useProject();

  const [gridWidth, setGridWidth] = useState(DIVIDER_DEFAULT);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Get visible tasks (respecting collapse state)
  const visibleTasks = getVisibleTasks(project.tasks, collapsedIds);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        const firstSelected = selection.size > 0 ? Array.from(selection)[0] : undefined;
        addTask(undefined, firstSelected);
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedDependencyId) {
            deleteDependency(selectedDependencyId);
          } else if (selection.size > 0) {
            e.preventDefault();
            deleteSelectedTasks();
          }
          break;
        case 'Escape':
          clearSelection();
          setEditingCell(null);
          break;
        case 'Insert': {
          const firstSelected = selection.size > 0 ? Array.from(selection)[0] : undefined;
          addTask(undefined, firstSelected);
          break;
        }
        case 'Tab': {
          e.preventDefault();
          const selected = Array.from(selection);
          if (selected.length === 1) {
            if (e.shiftKey) outdentTask(selected[0]);
            else indentTask(selected[0]);
          }
          break;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          if (selection.size === 1) {
            const currentId = Array.from(selection)[0];
            const currentIdx = visibleTasks.findIndex((t) => t.id === currentId);
            if (currentIdx !== -1) {
              const nextIdx = e.key === 'ArrowUp' ? currentIdx - 1 : currentIdx + 1;
              if (nextIdx >= 0 && nextIdx < visibleTasks.length) {
                selectTask(visibleTasks[nextIdx].id, false, false);
              }
            }
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection, deleteSelectedTasks, clearSelection, addTask, indentTask, outdentTask,
    visibleTasks, selectTask, selectedDependencyId, deleteDependency]);

  // Divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
    const startX = e.clientX;
    const startWidth = gridWidth;

    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(DIVIDER_MAX, Math.max(DIVIDER_MIN, startWidth + me.clientX - startX));
      setGridWidth(newWidth);
    };

    const onUp = () => {
      setIsDraggingDivider(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [gridWidth]);

  // Sync scroll between grid and chart
  const handleGridScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Keep grid scroll synced when chart scroll updates shared scrollTop
  useEffect(() => {
    if (!gridScrollRef.current) return;
    if (Math.abs(gridScrollRef.current.scrollTop - scrollTop) > 1) {
      gridScrollRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const ROW_HEIGHT = 32;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ userSelect: isDraggingDivider ? 'none' : undefined }}>
      {/* Task Grid */}
      <div
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{ width: gridWidth }}
      >
        {/* Grid Header */}
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => addTask(undefined, selection.size === 1 ? Array.from(selection)[0] : undefined)}
            className="text-[10px] text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
            title="Add task (Ctrl+Space)"
          >
            + Task
          </button>
          <button
            onClick={foldOneLevel}
            className="text-[10px] text-gray-600 hover:text-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-100"
            title="Fold one level"
          >
            −
          </button>
          <button
            onClick={unfoldOneLevel}
            className="text-[10px] text-gray-600 hover:text-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-100"
            title="Unfold one level"
          >
            +
          </button>
          {selection.size > 0 && (
            <button
              onClick={deleteSelectedTasks}
              className="text-[10px] text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50"
              title="Delete selected"
            >
              🗑️ Delete
            </button>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-gray-400">{visibleTasks.length} tasks</span>
        </div>

        {/* Scrollable grid */}
        <div
          ref={gridScrollRef}
          className="flex-1 overflow-y-auto overflow-x-auto"
          onScroll={handleGridScroll}
        >
          <TaskGrid
            tasks={visibleTasks}
            onRowClick={(id, e) => selectTask(id, e.metaKey || e.ctrlKey, e.shiftKey)}
            editingCell={editingCell}
            onEditCell={(taskId, field) => setEditingCell({ taskId, field })}
            onFinishEdit={() => setEditingCell(null)}
            rowHeight={ROW_HEIGHT}
          />
        </div>
      </div>

      {/* Divider */}
      <div
        className={`flex-shrink-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors relative group
          ${isDraggingDivider ? 'bg-blue-500' : 'bg-gray-300'}`}
        onMouseDown={handleDividerMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <GanttChart
          visibleTasks={visibleTasks}
          scrollTop={scrollTop}
          onScrollTopChange={setScrollTop}
        />
      </div>
    </div>
  );
}








