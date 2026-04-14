import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, format, startOfMonth, endOfMonth,
  differenceInCalendarDays, addDays, isWeekend, isSameDay,
  startOfQuarter, eachQuarterOfInterval, endOfQuarter,
  startOfYear, eachYearOfInterval, endOfYear,
} from 'date-fns';
import { useProject } from '../store/projectStore';
import type { Task, Dependency } from '../types';
import { TaskType, DependencyType } from '../types';

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 52; // Two-row header
const MIN_BAR_WIDTH = 8;

interface GanttChartProps {
  visibleTasks: Task[];
  scrollTop: number;
  onScrollTopChange: (top: number) => void;
}

interface BarInfo {
  task: Task;
  x: number;
  y: number;
  width: number;
  rowIdx: number;
}

interface TimelineInfo {
  dates: Date[];
  colWidth: number;
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

function useTimeline(tasks: Task[], zoomLevel: string): TimelineInfo {
  return useMemo(() => {
    const today = new Date();

    if (tasks.length === 0) {
      const startDate = addDays(today, -7);
      const endDate = addDays(today, 60);
      const totalDays = differenceInCalendarDays(endDate, startDate);
      return { dates: [], colWidth: 30, startDate, endDate, totalDays };
    }

    const allStarts = tasks.map((t) => t.startDate);
    const allEnds = tasks.map((t) => t.endDate);
    const minDate = new Date(Math.min(...allStarts.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allEnds.map((d) => d.getTime())));

    const startDate = addDays(minDate, -7);
    const endDate = addDays(maxDate, 14);
    const totalDays = differenceInCalendarDays(endDate, startDate);

    let dates: Date[] = [];
    let colWidth = 30;

    switch (zoomLevel) {
      case 'days':
        dates = eachDayOfInterval({ start: startDate, end: endDate });
        colWidth = 30;
        break;
      case 'weeks':
        dates = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
        colWidth = 80;
        break;
      case 'months':
        dates = eachMonthOfInterval({ start: startDate, end: endDate });
        colWidth = 100;
        break;
      case 'quarters':
        dates = eachQuarterOfInterval({ start: startDate, end: endDate });
        colWidth = 120;
        break;
      case 'years':
        dates = eachYearOfInterval({ start: startDate, end: endDate });
        colWidth = 150;
        break;
      default:
        dates = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
        colWidth = 80;
    }

    return { dates, colWidth, startDate, endDate, totalDays };
  }, [tasks, zoomLevel]);
}

function dateToX(date: Date, startDate: Date, dayWidth: number): number {
  const days = differenceInCalendarDays(date, startDate);
  return days * dayWidth;
}

function getBarColor(task: Task, showCritical: boolean): string {
  if (showCritical && task.isCritical) return '#dc2626';
  if (task.isMilestone || task.type === TaskType.Milestone) return '#7c3aed';
  if (task.type === TaskType.Summary) return '#1d4ed8';
  if (task.progress === 100) return '#059669';
  return task.color || '#3b82f6';
}

export function GanttChart({ visibleTasks, scrollTop, onScrollTopChange }: GanttChartProps) {
  const { project, selection, selectTask, clearSelection, addDependency, deleteDependency,
    selectedDependencyId, selectDependency, updateTask } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [dragging, setDragging] = useState<{
    type: 'bar' | 'resize-left' | 'resize-right' | 'dep-start';
    taskId: string;
    startX: number;
    startDate: Date;
    endDate: Date;
    taskStartDate: Date;
    taskEndDate: Date;
  } | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [depDragFrom, setDepDragFrom] = useState<{ taskId: string; side: 'start' | 'end'; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<{ task: Task; x: number; y: number } | null>(null);

  const timeline = useTimeline(visibleTasks, project.settings.zoomLevel);
  const dayWidth = timeline.colWidth / (
    project.settings.zoomLevel === 'days' ? 1 :
    project.settings.zoomLevel === 'weeks' ? 7 :
    project.settings.zoomLevel === 'months' ? 30 :
    project.settings.zoomLevel === 'quarters' ? 91 : 365
  );

  const totalWidth = timeline.dates.length * timeline.colWidth + timeline.colWidth;
  const totalHeight = visibleTasks.length * ROW_HEIGHT;

  // Calculate bar positions
  const bars: BarInfo[] = useMemo(() => {
    return visibleTasks.map((task, rowIdx) => {
      const x = dateToX(task.startDate, timeline.startDate, dayWidth);
      const endX = dateToX(task.endDate, timeline.startDate, dayWidth);
      const width = Math.max(MIN_BAR_WIDTH, endX - x);
      return { task, x, y: rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2, width, rowIdx };
    });
  }, [visibleTasks, timeline, dayWidth]);

  const barMap = useMemo(() => {
    const m = new Map<string, BarInfo>();
    bars.forEach((b) => m.set(b.task.id, b));
    return m;
  }, [bars]);

  // Scroll sync
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    onScrollTopChange(e.currentTarget.scrollTop);
  }, [onScrollTopChange]);

  // Sync scrollTop from parent
  useEffect(() => {
    if (containerRef.current && containerRef.current.scrollTop !== scrollTop) {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: string, handle: 'bar' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    const task = visibleTasks.find((t) => t.id === taskId);
    if (!task) return;

    setDragging({
      type: handle,
      taskId,
      startX: e.clientX,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
      taskStartDate: new Date(task.startDate),
      taskEndDate: new Date(task.endDate),
    });
  }, [visibleTasks]);

  const handleDepDragStart = useCallback((e: React.MouseEvent, taskId: string, side: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    const bar = barMap.get(taskId);
    if (!bar) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = side === 'start' ? bar.x : bar.x + bar.width;
    const y = bar.y;
    setDepDragFrom({ taskId, side, x, y });
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [barMap]);

  useEffect(() => {
    if (!dragging && !depDragFrom) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }

      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const daysDelta = Math.round(dx / dayWidth);

      if (dragging.type === 'bar') {
        const newStart = addDays(dragging.startDate, daysDelta);
        const newEnd = addDays(dragging.endDate, daysDelta);
        updateTask(dragging.taskId, { startDate: newStart, endDate: newEnd });
      } else if (dragging.type === 'resize-right') {
        const newEnd = addDays(dragging.endDate, daysDelta);
        if (differenceInCalendarDays(newEnd, dragging.taskStartDate) >= 0) {
          updateTask(dragging.taskId, {
            endDate: newEnd,
            duration: Math.max(0, differenceInCalendarDays(newEnd, dragging.taskStartDate)),
          });
        }
      } else if (dragging.type === 'resize-left') {
        const newStart = addDays(dragging.startDate, daysDelta);
        if (differenceInCalendarDays(dragging.taskEndDate, newStart) >= 0) {
          updateTask(dragging.taskId, {
            startDate: newStart,
            duration: Math.max(0, differenceInCalendarDays(dragging.taskEndDate, newStart)),
          });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (depDragFrom) {
        // Find which bar we dropped onto
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const targetRowIdx = Math.floor(my / ROW_HEIGHT);
          const targetBar = bars[targetRowIdx];

          if (targetBar && targetBar.task.id !== depDragFrom.taskId) {
            const distToStart = Math.abs(mx - targetBar.x);
            const distToEnd = Math.abs(mx - (targetBar.x + targetBar.width));
            const toSide = distToStart <= distToEnd ? 'start' : 'end';
            let type: DependencyType;
            if (depDragFrom.side === 'end' && toSide === 'start') type = DependencyType.FS;
            else if (depDragFrom.side === 'start' && toSide === 'start') type = DependencyType.SS;
            else if (depDragFrom.side === 'end' && toSide === 'end') type = DependencyType.FF;
            else type = DependencyType.SF;

            addDependency({ fromTaskId: depDragFrom.taskId, toTaskId: targetBar.task.id, type, lag: 0 });
          }
        }
      }

      setDragging(null);
      setDepDragFrom(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, depDragFrom, dayWidth, visibleTasks, updateTask, addDependency, bars]);

  // Render dependency arrows
  const depArrows = useMemo(() => {
    if (!project.settings.showDependencies) return null;

    return project.dependencies.map((dep) => {
      const fromBar = barMap.get(dep.fromTaskId);
      const toBar = barMap.get(dep.toTaskId);
      if (!fromBar || !toBar) return null;

      const isSelected = dep.id === selectedDependencyId;
      const isCritical = fromBar.task.isCritical && toBar.task.isCritical && project.settings.showCriticalPath;
      const color = isSelected ? '#1d40af' : isCritical ? '#dc2626' : '#6b7280';
      const strokeWidth = isSelected ? 2 : 1.5;

      // Calculate start/end points based on dep type
      let x1: number, y1: number, x2: number, y2: number;
      switch (dep.type) {
        case DependencyType.FS:
          x1 = fromBar.x + fromBar.width; y1 = fromBar.y;
          x2 = toBar.x; y2 = toBar.y;
          break;
        case DependencyType.FF:
          x1 = fromBar.x + fromBar.width; y1 = fromBar.y;
          x2 = toBar.x + toBar.width; y2 = toBar.y;
          break;
        case DependencyType.SS:
          x1 = fromBar.x; y1 = fromBar.y;
          x2 = toBar.x; y2 = toBar.y;
          break;
        case DependencyType.SF:
          x1 = fromBar.x; y1 = fromBar.y;
          x2 = toBar.x + toBar.width; y2 = toBar.y;
          break;
        default:
          x1 = fromBar.x + fromBar.width; y1 = fromBar.y;
          x2 = toBar.x; y2 = toBar.y;
      }

      // Orthogonal path
      const midX = (x1 + x2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      
      let path: string;
      const offset = 12;

      if (dep.type === DependencyType.FS) {
        if (dx >= offset * 2) {
          path = `M${x1},${y1} H${midX} V${y2} H${x2}`;
        } else {
          path = `M${x1},${y1} H${x1 + offset} V${y1 + (dy > 0 ? ROW_HEIGHT * 0.4 : -ROW_HEIGHT * 0.4)} H${x2 - offset} V${y2} H${x2}`;
        }
      } else if (dep.type === DependencyType.SS) {
        const leftEdge = Math.min(x1, x2) - offset;
        path = `M${x1},${y1} H${leftEdge} V${y2} H${x2}`;
      } else if (dep.type === DependencyType.FF) {
        const rightEdge = Math.max(x1, x2) + offset;
        path = `M${x1},${y1} H${rightEdge} V${y2} H${x2}`;
      } else {
        path = `M${x1},${y1} H${midX} V${y2} H${x2}`;
      }

      // Arrow marker
      const arrowSize = 6;
      let arrowPath: string;
      if (dep.type === DependencyType.FS || dep.type === DependencyType.SF) {
        // Arrow pointing right at x2
        arrowPath = `M${x2 - arrowSize},${y2 - arrowSize / 2} L${x2},${y2} L${x2 - arrowSize},${y2 + arrowSize / 2}`;
      } else {
        arrowPath = `M${x2 - arrowSize},${y2 - arrowSize / 2} L${x2},${y2} L${x2 - arrowSize},${y2 + arrowSize / 2}`;
      }

      return (
        <g key={dep.id} onClick={(e) => { e.stopPropagation(); selectDependency(dep.id); }}>
          {/* Clickable hit area */}
          <path d={path} fill="none" stroke="transparent" strokeWidth={10} style={{ cursor: 'pointer' }} />
          {/* Visual line */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={isSelected ? undefined : dep.lag !== 0 ? '4,2' : undefined}
          />
          {/* Arrow head */}
          <path d={arrowPath} fill={color} stroke="none" />
          {/* Selection highlight */}
          {isSelected && (
            <path d={path} fill="none" stroke="#93c5fd" strokeWidth={6} style={{ pointerEvents: 'none' }} />
          )}
        </g>
      );
    });
  }, [project.dependencies, project.settings, barMap, selectedDependencyId, selectDependency]);

  // Today line
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = dateToX(today, timeline.startDate, dayWidth);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onScroll={handleScroll}
      onClick={() => { clearSelection(); selectDependency(null); }}
    >
      <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>
        {/* Timeline Header */}
        <div
          className="sticky top-0 z-20 bg-[#f5f5f5] border-b border-gray-300"
          style={{ height: HEADER_HEIGHT }}
        >
          {/* Top row: months/quarters */}
          <div className="flex border-b border-gray-200" style={{ height: HEADER_HEIGHT / 2 }}>
            {renderTopHeaders(timeline, project.settings.zoomLevel)}
          </div>
          {/* Bottom row: weeks/days */}
          <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
            {timeline.dates.map((date, i) => (
              <div
                key={i}
                className={`flex-shrink-0 border-r border-gray-200 flex items-center justify-center text-[10px] text-gray-600 select-none
                  ${isWeekend(date) && project.settings.showWeekends ? 'bg-orange-50' : ''}
                  ${isSameDay(date, today) ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                style={{ width: timeline.colWidth }}
              >
                {formatColHeader(date, project.settings.zoomLevel)}
              </div>
            ))}
          </div>
        </div>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width={totalWidth}
          height={Math.max(totalHeight + 20, 300)}
          className="select-none"
        >
          {/* Background grid */}
          {timeline.dates.map((date, i) => {
            const x = i * timeline.colWidth;
            const isWknd = isWeekend(date) && project.settings.showWeekends;
            const isToday = isSameDay(date, today);
            return (
              <g key={i}>
                {isWknd && (
                  <rect x={x} y={0} width={timeline.colWidth} height={totalHeight + 20}
                    fill="#FEF3C7" opacity={0.3} />
                )}
                {isToday && (
                  <rect x={x} y={0} width={timeline.colWidth} height={totalHeight + 20}
                    fill="#EFF6FF" opacity={0.5} />
                )}
                <line x1={x} y1={0} x2={x} y2={totalHeight + 20}
                  stroke="#e5e7eb" strokeWidth={1} />
              </g>
            );
          })}

          {/* Row alternating background */}
          {visibleTasks.map((_, i) => (
            i % 2 === 1 ? (
              <rect key={i} x={0} y={i * ROW_HEIGHT} width={totalWidth} height={ROW_HEIGHT}
                fill="#f9fafb" opacity={0.5} />
            ) : null
          ))}

          {/* Row selection highlight */}
          {visibleTasks.map((task, i) => (
            selection.has(task.id) ? (
              <rect key={`sel-${task.id}`} x={0} y={i * ROW_HEIGHT} width={totalWidth} height={ROW_HEIGHT}
                fill="#dbeafe" opacity={0.5} />
            ) : null
          ))}

          {/* Today line */}
          <line
            x1={todayX} y1={0} x2={todayX} y2={totalHeight + 20}
            stroke="#3b82f6" strokeWidth={2} strokeDasharray="4,4"
          />
          <text x={todayX + 3} y={12} fill="#3b82f6" fontSize={10}>Today</text>

          {/* Dependency arrows (rendered behind bars) */}
          <g>{depArrows}</g>

          {/* Task Bars */}
          {bars.map(({ task, x, y, width, rowIdx }) => {
            const isSelected = selection.has(task.id);
            const isMilestone = task.isMilestone || task.type === TaskType.Milestone;
            const isSummary = task.type === TaskType.Summary;
            const barColor = getBarColor(task, project.settings.showCriticalPath);
            const barHeight = isMilestone ? 16 : isSummary ? 16 : 20;
            const barY = y - barHeight / 2;
            const progressWidth = Math.max(0, (task.progress / 100) * width);

            return (
              <g
                key={task.id}
                onClick={(e) => { e.stopPropagation(); selectTask(task.id, e.metaKey || e.ctrlKey, e.shiftKey); }}
                onMouseEnter={() => { setHoveredTaskId(task.id); }}
                onMouseLeave={() => { setHoveredTaskId(null); setTooltip(null); }}
                style={{ cursor: dragging ? 'ew-resize' : 'pointer' }}
              >
                {isMilestone ? (
                  /* Diamond for milestones */
                  <>
                    <polygon
                      points={`${x},${y} ${x + 10},${y - 10} ${x + 20},${y} ${x + 10},${y + 10}`}
                      fill={barColor}
                      stroke={isSelected ? '#1d4ed8' : 'transparent'}
                      strokeWidth={2}
                    />
                    <text x={x + 26} y={y + 4} fill="#374151" fontSize={11}>
                      {task.name}
                    </text>

                    {/* Dependency drag handles for milestones */}
                    {hoveredTaskId === task.id && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={5}
                          fill="white"
                          stroke={barColor}
                          strokeWidth={2}
                          style={{ cursor: 'crosshair' }}
                          onMouseDown={(e) => handleDepDragStart(e, task.id, 'start')}
                        />
                        <circle
                          cx={x + 20}
                          cy={y}
                          r={5}
                          fill="white"
                          stroke={barColor}
                          strokeWidth={2}
                          style={{ cursor: 'crosshair' }}
                          onMouseDown={(e) => handleDepDragStart(e, task.id, 'end')}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Main bar */}
                    <rect
                      x={x}
                      y={barY}
                      width={width}
                      height={barHeight}
                      rx={isSummary ? 0 : 3}
                      fill={barColor}
                      opacity={0.85}
                      stroke={isSelected ? '#1d4ed8' : isSummary ? '#1e3a8a' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 1}
                      onMouseDown={(e) => !isSummary && handleMouseDown(e, task.id, 'bar')}
                    />

                    {/* Summary task ears */}
                    {isSummary && (
                      <>
                        <rect x={x} y={barY + barHeight} width={8} height={6} rx={2} fill={barColor} />
                        <rect x={x + width - 8} y={barY + barHeight} width={8} height={6} rx={2} fill={barColor} />
                      </>
                    )}

                    {/* Progress bar */}
                    {project.settings.showProgress && progressWidth > 0 && !isMilestone && (
                      <rect
                        x={x}
                        y={barY}
                        width={progressWidth}
                        height={barHeight}
                        rx={3}
                        fill="white"
                        opacity={0.35}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {/* Resize handles */}
                    {hoveredTaskId === task.id && !isSummary && (
                      <>
                        <rect
                          x={x}
                          y={barY}
                          width={6}
                          height={barHeight}
                          rx={2}
                          fill="white"
                          opacity={0.8}
                          style={{ cursor: 'w-resize' }}
                          onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-left')}
                        />
                        <rect
                          x={x + width - 6}
                          y={barY}
                          width={6}
                          height={barHeight}
                          rx={2}
                          fill="white"
                          opacity={0.8}
                          style={{ cursor: 'e-resize' }}
                          onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-right')}
                        />
                      </>
                    )}

                    {/* Dependency drag handles */}
                    {hoveredTaskId === task.id && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={5}
                          fill="white"
                          stroke={barColor}
                          strokeWidth={2}
                          style={{ cursor: 'crosshair' }}
                          onMouseDown={(e) => handleDepDragStart(e, task.id, 'start')}
                        />
                        <circle
                          cx={x + width}
                          cy={y}
                          r={5}
                          fill="white"
                          stroke={barColor}
                          strokeWidth={2}
                          style={{ cursor: 'crosshair' }}
                          onMouseDown={(e) => handleDepDragStart(e, task.id, 'end')}
                        />
                      </>
                    )}

                    {/* Task label (if bar wide enough) */}
                    {width > 40 && (
                      <text
                        x={x + 5}
                        y={y + 4}
                        fill="white"
                        fontSize={10}
                        style={{ pointerEvents: 'none' }}
                      >
                        {task.name.length > Math.floor(width / 7) ? task.name.substring(0, Math.floor(width / 7)) + '…' : task.name}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Dependency drag preview */}
          {depDragFrom && (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={depDragFrom.x}
                y1={depDragFrom.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6,3"
              />
              <circle cx={mousePos.x} cy={mousePos.y} r={5} fill="#3b82f6" opacity={0.7} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function renderTopHeaders(timeline: TimelineInfo, zoomLevel: string): React.ReactNode[] {
  if (zoomLevel === 'days') {
    // Group by month
    const months = new Map<string, { date: Date; count: number }>();
    timeline.dates.forEach((date) => {
      const key = format(date, 'yyyy-MM');
      if (!months.has(key)) months.set(key, { date, count: 0 });
      months.get(key)!.count++;
    });
    return Array.from(months.values()).map(({ date, count }, i) => (
      <div
        key={i}
        className="flex-shrink-0 border-r border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-100"
        style={{ width: count * timeline.colWidth }}
      >
        {format(date, 'MMMM yyyy')}
      </div>
    ));
  }

  if (zoomLevel === 'weeks') {
    // Group by month
    const months = new Map<string, { date: Date; count: number }>();
    timeline.dates.forEach((date) => {
      const key = format(date, 'yyyy-MM');
      if (!months.has(key)) months.set(key, { date, count: 0 });
      months.get(key)!.count++;
    });
    return Array.from(months.values()).map(({ date, count }, i) => (
      <div
        key={i}
        className="flex-shrink-0 border-r border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-100"
        style={{ width: count * timeline.colWidth }}
      >
        {format(date, 'MMM yyyy')}
      </div>
    ));
  }

  if (zoomLevel === 'months') {
    // Group by year
    const years = new Map<string, { date: Date; count: number }>();
    timeline.dates.forEach((date) => {
      const key = format(date, 'yyyy');
      if (!years.has(key)) years.set(key, { date, count: 0 });
      years.get(key)!.count++;
    });
    return Array.from(years.values()).map(({ date, count }, i) => (
      <div
        key={i}
        className="flex-shrink-0 border-r border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-100"
        style={{ width: count * timeline.colWidth }}
      >
        {format(date, 'yyyy')}
      </div>
    ));
  }

  if (zoomLevel === 'quarters') {
    const years = new Map<string, { date: Date; count: number }>();
    timeline.dates.forEach((date) => {
      const key = format(date, 'yyyy');
      if (!years.has(key)) years.set(key, { date, count: 0 });
      years.get(key)!.count++;
    });
    return Array.from(years.values()).map(({ date, count }, i) => (
      <div
        key={i}
        className="flex-shrink-0 border-r border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-100"
        style={{ width: count * timeline.colWidth }}
      >
        {format(date, 'yyyy')}
      </div>
    ));
  }

  // Years - just empty top header
  return [<div key={0} className="flex-1 bg-gray-100" />];
}

function formatColHeader(date: Date, zoomLevel: string): string {
  switch (zoomLevel) {
    case 'days': return format(date, 'd');
    case 'weeks': return `W${format(date, 'w')} ${format(date, 'MM/dd')}`;
    case 'months': return format(date, 'MMM');
    case 'quarters': return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    case 'years': return format(date, 'yyyy');
    default: return format(date, 'MM/dd');
  }
}










