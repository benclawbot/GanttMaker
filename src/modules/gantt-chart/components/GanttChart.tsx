/**
 * GanttChart Component - Full Integration
 * Displays tasks from TaskContext with interactions and hierarchical support
 * Supports drag-and-drop dependency creation and deletion
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTaskManager } from '@context/TaskContext';
import { DependencyType } from '@modules/task-manager/types';

interface TaskDisplay {
  id: string;
  text: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
  type?: 'task' | 'project' | 'milestone';
  parentId?: string;
  level: number;
}

interface LinkDisplay {
  id: string;
  source: string;
  target: string;
  type: 'fs' | 'ss' | 'ff' | 'sf';
  lag?: number;
}

interface DragState {
  taskId: string;
  handle: 'start' | 'end';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDaysDiff(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const ROW_HEIGHT = 48;
const BAR_HEIGHT = 24;
const LABEL_WIDTH = 224;
const TIMELINE_PADDING = 8;
const HANDLE_SIZE = 12;
const ROW_MARGIN = 20; // Extra space above/below rows for dependency paths

export function GanttChart() {
  const { state, addLink, deleteLink, deleteTask } = useTaskManager();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastClickedTaskId, setLastClickedTaskId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [lastClickedLinkId, setLastClickedLinkId] = useState<string | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredHandle, setHoveredHandle] = useState<{ taskId: string; handle: 'start' | 'end' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(600);
  
  // Measure timeline width
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth - TIMELINE_PADDING * 2);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Handle keyboard events for deleting dependencies and tasks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
      // Escape to deselect all
      if (e.key === 'Escape') {
        setSelectedTaskIds(new Set());
        setSelectedTaskId(null);
        setSelectedLinkIds(new Set());
        setSelectedLinkId(null);
        return;
      }
      
      // Delete selected links
      if (selectedLinkIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        selectedLinkIds.forEach((id) => deleteLink(id));
        setSelectedLinkIds(new Set());
        setSelectedLinkId(null);
        return;
      }
      
      // Delete selected tasks
      if (selectedTaskIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        selectedTaskIds.forEach((id) => deleteTask(id));
        setSelectedTaskIds(new Set());
        setSelectedTaskId(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedLinkIds, selectedTaskIds, deleteLink, deleteTask]);
  
  // Global mouse move/up handlers for drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      if (hoveredHandle && dragState) {
        if (hoveredHandle.taskId !== dragState.taskId) {
          let type: DependencyType;
          if (dragState.handle === 'end' && hoveredHandle.handle === 'start') {
            type = DependencyType.FS;
          } else if (dragState.handle === 'start' && hoveredHandle.handle === 'start') {
            type = DependencyType.SS;
          } else if (dragState.handle === 'end' && hoveredHandle.handle === 'end') {
            type = DependencyType.FF;
          } else if (dragState.handle === 'start' && hoveredHandle.handle === 'end') {
            type = DependencyType.SF;
          } else {
            type = DependencyType.FS;
          }
          
          try {
            addLink({ source: dragState.taskId, target: hoveredHandle.taskId, type });
          } catch (err) {
            console.warn('Could not create link:', err);
          }
        }
      }
      
      setIsDragging(false);
      setDragState(null);
      setHoveredHandle(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragState, hoveredHandle, addLink]);
  
  // Build hierarchical task list
  const tasks: TaskDisplay[] = useMemo(() => {
    const taskMap = new Map<string, typeof state.tasks[0]>();
    state.tasks.forEach((task) => taskMap.set(String(task.id), task));
    
    const tasksWithLevel = state.tasks
      .filter((task) => task.startDate && task.endDate) // Only include tasks with valid dates
      .map((task) => {
        let level = 0;
        let current: typeof task | undefined = task;
        while (current?.parentId) {
          const parent = taskMap.get(String(current.parentId));
          if (parent) { level++; current = parent; } else break;
        }
        return { 
          ...task, 
          id: String(task.id), 
          parentId: task.parentId ? String(task.parentId) : undefined,
          level,
          startDate: task.startDate!,
          endDate: task.endDate!,
        };
      });
    
    return tasksWithLevel.filter((task) => {
      if (!task.parentId) return true;
      let current: typeof task | undefined = task;
      while (current?.parentId) {
        if (collapsedTasks.has(String(current.parentId))) return false;
        current = tasksWithLevel.find((t) => String(t.id) === String(current!.parentId));
      }
      return true;
    });
  }, [state.tasks, collapsedTasks]);
  
  const links: LinkDisplay[] = useMemo(() => {
    return state.links.map((l) => ({
      id: String(l.id),
      source: String(l.source),
      target: String(l.target),
      type: l.type as 'fs' | 'ss' | 'ff' | 'sf',
      lag: l.lag,
    }));
  }, [state.links]);
  
  const timelineRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), totalDays: 30 };
    }
    const starts = tasks.map((t) => t.startDate.getTime());
    const ends = tasks.map((t) => t.endDate.getTime());
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));
    const totalDays = getDaysDiff(minStart, maxEnd) + 5;
    return { start: minStart, end: maxEnd, totalDays: Math.max(totalDays, 30) };
  }, [tasks]);
  
  const timelineMarkers = useMemo(() => {
    const { start, totalDays } = timelineRange;
    const markerCount = Math.min(Math.ceil(totalDays / 5), 10);
    const dayStep = Math.ceil(totalDays / markerCount);
    return Array.from({ length: markerCount + 1 }, (_, i) => {
      const date = new Date(start.getTime() + i * dayStep * 24 * 60 * 60 * 1000);
      return { date, label: formatDate(date) };
    });
  }, [timelineRange]);
  
  const getBarStyle = useCallback((task: TaskDisplay) => {
    const { start, totalDays } = timelineRange;
    const startOffset = getDaysDiff(start, task.startDate);
    const duration = getDaysDiff(task.startDate, task.endDate);
    const left = (startOffset / totalDays) * 100;
    const width = Math.max((duration / totalDays) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  }, [timelineRange]);
  
  const getBarPixels = useCallback((task: TaskDisplay) => {
    const { start, totalDays } = timelineRange;
    const startOffset = getDaysDiff(start, task.startDate);
    const duration = getDaysDiff(task.startDate, task.endDate);
    const left = (startOffset / totalDays) * timelineWidth;
    const width = Math.max((duration / totalDays) * timelineWidth, 4);
    return { left, right: left + width };
  }, [timelineRange, timelineWidth]);
  
  const getHandlePosition = useCallback((taskId: string, handle: 'start' | 'end'): { x: number; y: number } | null => {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const pixels = getBarPixels(tasks[taskIndex]);
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return null;
    
    const y = timelineRect.top + taskIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x = timelineRect.left + TIMELINE_PADDING + (handle === 'start' ? pixels.left : pixels.right);
    
    return { x, y };
  }, [tasks, getBarPixels]);
  
  useEffect(() => {
    if (!isDragging || !dragState) {
      setHoveredHandle(null);
      return;
    }
    
    const threshold = 25;
    let closest: typeof hoveredHandle = null;
    let closestDist = threshold;
    
    tasks.forEach((task) => {
      if (task.id === dragState.taskId || task.type === 'milestone') return;
      
      ['start', 'end'].forEach((handle) => {
        const pos = getHandlePosition(task.id, handle as 'start' | 'end');
        if (!pos) return;
        
        const dist = Math.sqrt(Math.pow(pos.x - mousePos.x, 2) + Math.pow(pos.y - mousePos.y, 2));
        if (dist < closestDist) {
          closestDist = dist;
          closest = { taskId: task.id, handle: handle as 'start' | 'end' };
        }
      });
    });
    
    setHoveredHandle(closest);
  }, [isDragging, dragState, mousePos, tasks, getHandlePosition]);
  
  const handleTaskClick = useCallback((taskId: string, e: React.MouseEvent) => {
    setSelectedLinkId(null);
    
    // Shift+click: range selection
    if (e.shiftKey && lastClickedTaskId) {
      const lastIndex = tasks.findIndex((t) => t.id === lastClickedTaskId);
      const currentIndex = tasks.findIndex((t) => t.id === taskId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = tasks.slice(start, end + 1).map((t) => t.id);
        setSelectedTaskIds((prev) => {
          const newSet = new Set(prev);
          rangeIds.forEach((id) => newSet.add(id));
          return newSet;
        });
        setSelectedTaskId(taskId);
        return;
      }
    }
    
    // Ctrl+click or Cmd+click: toggle selection (add/remove from selection)
    if (e.ctrlKey || e.metaKey) {
      setSelectedTaskIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
      setSelectedTaskId((prev) => (prev === taskId ? null : taskId));
      setLastClickedTaskId(taskId);
      return;
    }
    
    // Regular click: single selection
    setSelectedTaskIds(new Set([taskId]));
    setSelectedTaskId(taskId);
    setLastClickedTaskId(taskId);
  }, [lastClickedTaskId, tasks]);

  const handleLinkClick = useCallback((linkId: string, e?: React.MouseEvent) => {
    // Shift+click: range selection (select all links between last clicked and current)
    if (e?.shiftKey && lastClickedLinkId) {
      const lastIndex = links.findIndex((l) => l.id === lastClickedLinkId);
      const currentIndex = links.findIndex((l) => l.id === linkId);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = links.slice(start, end + 1).map((l) => l.id);
        setSelectedLinkIds((prev) => {
          const newSet = new Set(prev);
          rangeIds.forEach((id) => newSet.add(id));
          return newSet;
        });
        setSelectedLinkId(linkId);
        return;
      }
    }
    
    // Ctrl+click or Cmd+click: toggle selection
    if (e?.ctrlKey || e?.metaKey) {
      setSelectedLinkIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(linkId)) {
          newSet.delete(linkId);
        } else {
          newSet.add(linkId);
        }
        return newSet;
      });
      setSelectedLinkId((prev) => (prev === linkId ? null : linkId));
      setLastClickedLinkId(linkId);
      return;
    }
    
    // Regular click: single selection
    setSelectedLinkIds(new Set([linkId]));
    setSelectedLinkId(linkId);
    setSelectedTaskId(null);
    setSelectedTaskIds(new Set());
    setLastClickedLinkId(linkId);
  }, [lastClickedLinkId, links]);
  
  // Handle clicking on dependency links - use elementFromPoint to find exact element
  const handleLinksContainerClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Find the actual element at the click position (handles overlapping paths)
    const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
    const linkId = clickedElement?.getAttribute('data-link-id');
    if (linkId) {
      e.stopPropagation();
      e.preventDefault();
      handleLinkClick(linkId, e);
    }
  }, [handleLinkClick]);
  
  const toggleCollapse = useCallback((taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);
  
  const hasChildren = useCallback(
    (taskId: string): boolean => state.tasks.some((t) => String(t.parentId) === String(taskId)),
    [state.tasks]
  );
  
  const getTaskColor = (type?: string) => {
    switch (type) {
      case 'project': return 'bg-purple-500';
      case 'milestone': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };
  
  const handleDragStart = useCallback((taskId: string, handle: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ taskId, handle });
    setIsDragging(true);
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);
  
  /**
   * Calculate the SVG path for a dependency connector.
   * 
   * Creates an orthogonal connector path based on the reference image pattern:
   * - FS: Right → Right offset → Left (Finish-to-Start)
   * - FF: Right → Right offset → Right (Finish-to-Finish)
   * - SS: Left → Right offset → Left (Start-to-Start)
   * - SF: Left → Left offset → Right (Start-to-Finish)
   * 
   * @param sourceIndex - Task row index
   * @param targetIndex - Task row index
   * @param dependencyType - Type of relationship (fs, ss, ff, sf)
   * @param sourcePixels - Start position (left/right of source task)
   * @param targetPixels - End position (left/right of target task)
   * @returns SVG path string and coordinates
   */
  const calculatePath = useCallback((
    sourceIndex: number,
    targetIndex: number,
    dependencyType: 'fs' | 'ss' | 'ff' | 'sf',
    sourcePixels: { left: number; right: number },
    targetPixels: { left: number; right: number }
  ): { path: string; startX: number; startY: number; endX: number; endY: number } => {
    // Calculate Y positions (vertical center of each row)
    const startY = sourceIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    const endY = targetIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Determine anchor points based on dependency type
    let startX: number;
    let endX: number;

    switch (dependencyType) {
      case 'fs': // Finish-to-Start
        startX = sourcePixels.right;
        endX = targetPixels.left;
        break;
      case 'ss': // Start-to-Start
        startX = sourcePixels.left;
        endX = targetPixels.left;
        break;
      case 'ff': // Finish-to-Finish
        startX = sourcePixels.right;
        endX = targetPixels.right;
        break;
      case 'sf': // Start-to-Finish
        startX = sourcePixels.left;
        endX = targetPixels.right;
        break;
      default:
        startX = sourcePixels.right;
        endX = targetPixels.left;
    }

    // Calculate routing based on dependency type and relative positions
    let path: string;
    const vertOffset = 30; // How far to go around tasks
    
    if (dependencyType === 'ss') {
      // Start-to-Start: go around source task first (down), then across, then back up to target's left
      // If source is left of target, go down from source, across, then down to target
      if (sourceIndex < targetIndex) {
        // Source is above target: go down from source left, across, then up to target left
        path = `M ${startX} ${startY}
                L ${startX} ${startY + vertOffset}
                L ${endX} ${startY + vertOffset}
                L ${endX} ${endY}`;
      } else {
        // Source is below target: go up from source left, across, then down to target left
        path = `M ${startX} ${startY}
                L ${startX} ${startY - vertOffset}
                L ${endX} ${startY - vertOffset}
                L ${endX} ${endY}`;
      }
    } else if (dependencyType === 'ff') {
      // Finish-to-Finish: always go around to the right to avoid both tasks
      const rightEdge = Math.max(sourcePixels.right, targetPixels.right) + 25;
      path = `M ${startX} ${startY}
              L ${rightEdge} ${startY}
              L ${rightEdge} ${endY}
              L ${endX} ${endY}`;
    } else {
      // FS and SF: use midpoint routing
      const midX = (startX + endX) / 2;
      path = `M ${startX} ${startY}
              L ${midX} ${startY}
              L ${midX} ${endY}
              L ${endX} ${endY}`;
    }

    return {
      path,
      startX,
      startY,
      endX,
      endY,
    };
  }, []);
  
  const todayLineX = useMemo(() => {
    const { start, totalDays } = timelineRange;
    const today = new Date();
    const daysOffset = getDaysDiff(start, today);
    if (daysOffset < 0 || daysOffset > totalDays) return null;
    return TIMELINE_PADDING + (daysOffset / totalDays) * timelineWidth;
  }, [timelineRange, timelineWidth]);

  /**
   * Generate SVG elements for all dependency connectors.
   * Creates clean, type-aware connector paths with proper anchoring.
   */
  const dependencyLines = useMemo(() => {
    if (tasks.length === 0) return null;

    const taskIndexMap = new Map<string, number>();
    tasks.forEach((task, index) => taskIndexMap.set(task.id, index));

    const lines: React.ReactElement[] = [];

    links.forEach((link) => {
      const sourceIndex = taskIndexMap.get(link.source);
      const targetIndex = taskIndexMap.get(link.target);
      if (sourceIndex === undefined || targetIndex === undefined) return;

      const sourcePixels = getBarPixels(tasks[sourceIndex]);
      const targetPixels = getBarPixels(tasks[targetIndex]);

      // Calculate path with type-aware anchor points
      const pathData = calculatePath(
        sourceIndex,
        targetIndex,
        link.type,
        sourcePixels,
        targetPixels
      );

      // Determine visual style
      const isSelected = selectedLinkId === link.id || selectedLinkIds.has(link.id);
      const isConnectedToSelectedTask =
        selectedTaskId === link.source ||
        selectedTaskId === link.target ||
        [...selectedTaskIds].some((id) => id === link.source || id === link.target);

      const color = isSelected ? '#1e40af' : isConnectedToSelectedTask ? '#2563EB' : '#3b82f6';
      const strokeWidth = isSelected ? 3 : isConnectedToSelectedTask ? 2.5 : 2;

      lines.push(
        <g key={link.id}>
          {/* Invisible wider clickable area */}
          <path
            d={pathData.path}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            style={{ cursor: 'pointer' }}
            data-link-id={link.id}
          />

          {/* Arrow marker definition - smaller to match reference image */}
          <defs>
            <marker
              id={`arrow-${link.id}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} />
            </marker>
          </defs>

          {/* Selection glow effect */}
          {isSelected && (
            <path
              d={pathData.path}
              fill="none"
              stroke="#93C5FD"
              strokeWidth={8}
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Connector line */}
          <path
            d={pathData.path}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            markerEnd={`url(#arrow-${link.id})`}
            style={{ pointerEvents: 'none' }}
          />

          {/* Connection point circles (source and target) */}
          <circle
            cx={pathData.startX}
            cy={pathData.startY}
            r={4}
            fill={color}
            style={{ pointerEvents: 'none', opacity: 0.9 }}
          />
          <circle
            cx={pathData.endX}
            cy={pathData.endY}
            r={4}
            fill={color}
            style={{ pointerEvents: 'none', opacity: 0.9 }}
          />
        </g>
      );
    });

    return lines;
  }, [links, tasks, getBarPixels, selectedLinkId, selectedLinkIds, selectedTaskId, selectedTaskIds, handleLinkClick, calculatePath]);
  
  /**
   * Generate preview path during drag operations for creating new dependencies.
   */
  const dragPreview = useMemo(() => {
    if (!isDragging || !dragState || !hoveredHandle) return null;

    const sourceIndex = tasks.findIndex((t) => t.id === dragState.taskId);
    const targetIndex = tasks.findIndex((t) => t.id === hoveredHandle.taskId);
    if (sourceIndex === -1 || targetIndex === -1) return null;

    const sourcePixels = getBarPixels(tasks[sourceIndex]);
    const targetPixels = getBarPixels(tasks[targetIndex]);

    // Determine dependency type based on which handles are being dragged
    let dependencyType: 'fs' | 'ss' | 'ff' | 'sf';
    if (dragState.handle === 'end' && hoveredHandle.handle === 'start') {
      dependencyType = 'fs'; // Finish-to-Start
    } else if (dragState.handle === 'start' && hoveredHandle.handle === 'start') {
      dependencyType = 'ss'; // Start-to-Start
    } else if (dragState.handle === 'end' && hoveredHandle.handle === 'end') {
      dependencyType = 'ff'; // Finish-to-Finish
    } else if (dragState.handle === 'start' && hoveredHandle.handle === 'end') {
      dependencyType = 'sf'; // Start-to-Finish
    } else {
      dependencyType = 'fs'; // Default
    }

    const pathData = calculatePath(sourceIndex, targetIndex, dependencyType, sourcePixels, targetPixels);

    return (
      <>
        <path
          d={pathData.path}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
        <circle cx={pathData.endX} cy={pathData.endY} r={6} fill="#3B82F6" stroke="white" strokeWidth={2} />
      </>
    );
  }, [isDragging, dragState, hoveredHandle, tasks, getBarPixels, calculatePath]);
  
  return (
    <div className="p-4 h-full flex flex-col" onClick={() => setSelectedLinkId(null)}>
      <h2 className="text-xl font-bold mb-4">Gantt Chart</h2>
      
      <div className="mb-2 text-xs text-gray-500 flex gap-4">
        <span>• Drag from handles (●) to create dependencies</span>
        <span>• Click a line to select, then Delete to remove</span>
      </div>
      
      <div className="flex border-b border-gray-200 pb-2 mb-2">
        <div className="w-56 font-medium text-gray-700 flex-shrink-0">Task Name</div>
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 flex">
            {timelineMarkers.map((marker, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-xs text-gray-500 text-center border-l border-gray-200 pl-1"
                style={{ width: i === 0 ? 'auto' : `${100 / timelineMarkers.length}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto" ref={chartRef}>
        <div className="flex">
          <div className="w-56 flex-shrink-0">
            {tasks.map((task) => {
              const isSelected = selectedTaskId === task.id || selectedTaskIds.has(task.id);
              const hasKids = hasChildren(task.id);
              const isCollapsed = collapsedTasks.has(task.id);
              
              return (
                <div
                  key={task.id}
                  className={`h-12 flex items-center px-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={(e) => handleTaskClick(task.id, e)}
                >
                  <div style={{ width: task.level * 20 }} />
                  {hasKids ? (
                    <button
                      onClick={(e) => toggleCollapse(task.id, e)}
                      className="w-5 h-5 flex items-center justify-center hover:bg-gray-200 rounded flex-shrink-0"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="w-5 flex-shrink-0" />
                  )}
                  {task.type === 'project' && (
                    <svg className="w-4 h-4 text-purple-500 flex-shrink-0 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  )}
                  {task.type === 'milestone' && (
                    <div className="w-3 h-3 bg-yellow-500 rounded-sm flex-shrink-0 ml-1" />
                  )}
                  {task.type !== 'project' && task.type !== 'milestone' && (
                    <div className="w-3 h-3 border border-gray-300 rounded-sm flex-shrink-0 ml-1" />
                  )}
                  <span className="truncate text-sm ml-1">{task.text}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex-1 relative" ref={timelineRef}>
            <svg
              className="absolute top-0 left-0 z-10"
              width={timelineWidth + TIMELINE_PADDING * 2}
              height={tasks.length * ROW_HEIGHT}
              style={{ marginLeft: TIMELINE_PADDING }}
              onClick={handleLinksContainerClick}
            >
              {todayLineX !== null && tasks.length > 0 && (
                <line
                  x1={todayLineX}
                  x2={todayLineX}
                  y1={0}
                  y2={tasks.length * ROW_HEIGHT}
                  stroke="#ef4444"
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {dependencyLines}
              {dragPreview}
            </svg>
            
            {tasks.map((task, index) => {
              const isSelected = selectedTaskId === task.id || selectedTaskIds.has(task.id);
              const barStyle = getBarStyle(task);
              const isSourceTask = dragState?.taskId === task.id;
              
              return (
                <div
                  key={task.id}
                  className={`h-12 flex items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  style={{ paddingLeft: TIMELINE_PADDING, paddingRight: TIMELINE_PADDING }}
                  onClick={(e) => handleTaskClick(task.id, e)}
                >
                  <div className="relative w-full h-8 bg-gray-100 rounded">
                    {task.type !== 'milestone' && (
                      <>
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 cursor-crosshair transition-all ${
                            hoveredHandle?.taskId === task.id && hoveredHandle?.handle === 'start'
                              ? 'bg-blue-400 border-blue-500 scale-150 z-30'
                              : isSourceTask && dragState?.handle === 'start'
                              ? 'bg-blue-500 border-blue-600 scale-125 z-30'
                              : 'bg-white border-blue-500 hover:bg-blue-100 hover:scale-110 z-20'
                          }`}
                          style={{
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            left: `calc(${barStyle.left} - ${HANDLE_SIZE / 2}px)`,
                          }}
                          onMouseDown={(e) => handleDragStart(task.id, 'start', e)}
                        />
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 cursor-crosshair transition-all ${
                            hoveredHandle?.taskId === task.id && hoveredHandle?.handle === 'end'
                              ? 'bg-blue-400 border-blue-500 scale-150 z-30'
                              : isSourceTask && dragState?.handle === 'end'
                              ? 'bg-blue-500 border-blue-600 scale-125 z-30'
                              : 'bg-white border-blue-500 hover:bg-blue-100 hover:scale-110 z-20'
                          }`}
                          style={{
                            width: HANDLE_SIZE,
                            height: HANDLE_SIZE,
                            left: `calc(${barStyle.left} + ${barStyle.width} - ${HANDLE_SIZE / 2}px)`,
                          }}
                          onMouseDown={(e) => handleDragStart(task.id, 'end', e)}
                        />
                      </>
                    )}
                    
                    {task.type === 'milestone' ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-500 rotate-45"
                        style={{ left: barStyle.left }}
                      />
                    ) : (
                      <>
                        <div
                          className={`absolute top-1 h-6 rounded ${getTaskColor(task.type)} transition-all ${
                            isSelected ? 'ring-2 ring-blue-400' : ''
                          }`}
                          style={barStyle}
                        >
                          <div className="h-full rounded bg-white/30" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                        {/* Progress percentage label */}
                        <div
                          className="absolute top-1 text-xs font-semibold text-white pointer-events-none"
                          style={{
                            left: `calc(${barStyle.left} + ${barStyle.width} + 6px)`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.progress}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No tasks to display. Import a .gan file or create a new project.
          </div>
        )}
      </div>
      
      {links.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium mr-4">{links.length} dependency link(s)</span>
          <span className="mr-3">FS = Finish→Start</span>
          <span className="mr-3">SS = Start→Start</span>
          <span className="mr-3">FF = Finish→Finish</span>
          <span className="mr-3">SF = Start→Finish</span>
          <span className="text-gray-400">|</span>
          <span className="ml-3 text-gray-500">Click to select, Ctrl+click multi-select, Delete to remove</span>
          {selectedLinkIds.size > 0 && (
            <span className="ml-4 text-blue-600 font-medium">
              {selectedLinkIds.size === 1 ? '1 link selected' : `${selectedLinkIds.size} links selected`} — press Delete to remove
            </span>
          )}
          {selectedTaskIds.size > 1 && (
            <span className="ml-4 text-blue-600 font-medium">{selectedTaskIds.size} tasks selected — press Delete to remove</span>
          )}
        </div>
      )}
      
      {selectedTaskIds.size > 0 && !selectedLinkId && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">
            {selectedTaskIds.size === 1 ? 'Selected Task' : `${selectedTaskIds.size} Tasks Selected`}
          </h3>
          {selectedTaskIds.size === 1 ? (
            <TaskDetails taskId={[...selectedTaskIds][0]} links={links} />
          ) : (
            <div className="text-sm">
              <p className="text-gray-600 mb-2">Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Delete</kbd> to remove all selected tasks</p>
              <p className="text-gray-600 mb-2">Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Escape</kbd> to deselect</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskDetailsProps {
  taskId: string;
  links?: LinkDisplay[];
}

function TaskDetails({ taskId, links = [] }: TaskDetailsProps) {
  const { state } = useTaskManager();
  const task = state.tasks.find((t) => String(t.id) === taskId);
  if (!task) return null;
  
  const taskLinks = links.filter((l) => l.source === taskId || l.target === taskId);
  
  return (
    <div className="text-sm space-y-1">
      <p><span className="text-gray-600">Name:</span> {task.text}</p>
      <p><span className="text-gray-600">Start:</span> {task.startDate?.toLocaleDateString()}</p>
      <p><span className="text-gray-600">End:</span> {task.endDate?.toLocaleDateString()}</p>
      <p><span className="text-gray-600">Progress:</span> {task.progress || 0}%</p>
      <p><span className="text-gray-600">Type:</span> {task.type || 'task'}</p>
      {task.parentId && <p><span className="text-gray-600">Parent:</span> {task.parentId}</p>}
      {taskLinks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <span className="text-gray-600">Dependencies:</span>
          <ul className="ml-4 mt-1">
            {taskLinks.map((link) => (
              <li key={link.id}>
                {link.source === taskId ? '→' : '←'} {link.type.toUpperCase()} →{' '}
                {link.source === taskId ? link.target : link.source}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GanttChart;
