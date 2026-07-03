import { describe, expect, it } from 'vitest';
import {
  createTimeline,
  dateToX,
  formatTimelineColumnLabel,
  getTimelineHeaderSegments,
  getTimelineGuides,
} from './ganttTimeline';
import { TaskType, type Task } from '../types';

function task(startDate: Date, endDate: Date): Task {
  return {
    id: 'task-1',
    name: 'Calendar sensitive task',
    type: TaskType.Task,
    startDate,
    endDate,
    duration: 30,
    progress: 0,
    priority: 'Normal',
    isMilestone: false,
    isCritical: false,
    isCollapsed: false,
    resources: [],
    level: 0,
    order: 0,
  };
}

describe('gantt timeline positioning', () => {
  it('uses compact column labels and only shows day numbers in daily view', () => {
    const date = new Date(2026, 6, 3);

    expect(formatTimelineColumnLabel(date, 'days')).toBe('03');
    expect(formatTimelineColumnLabel(date, 'weeks')).toMatch(/^W\d+$/);
    expect(formatTimelineColumnLabel(date, 'months')).toBe('Jul');
    expect(formatTimelineColumnLabel(date, 'quarters')).toBe('Q3');
    expect(formatTimelineColumnLabel(date, 'years')).toBe('2026');

    (['weeks', 'months', 'quarters', 'years'] as const).forEach((zoomLevel) => {
      expect(formatTimelineColumnLabel(date, zoomLevel)).not.toContain('/');
    });
  });

  it('exposes exact day guides inside weekly columns', () => {
    const timeline = createTimeline(
      [task(new Date(2026, 6, 3), new Date(2026, 6, 8))],
      'weeks',
      new Date(2026, 6, 3),
    );
    const july3X = dateToX(new Date(2026, 6, 3), timeline);
    const weekStartX = dateToX(new Date(2026, 5, 29), timeline);
    const guides = getTimelineGuides(timeline, 'weeks');
    const july3Guide = guides.find((guide) => guide.date.getTime() === new Date(2026, 6, 3).getTime());

    expect(july3Guide).toBeDefined();
    expect(july3Guide?.x).toBeCloseTo(july3X);
    expect(july3Guide!.x).toBeGreaterThan(weekStartX);
    expect(july3Guide!.x).toBeLessThan(weekStartX + timeline.colWidth);
  });

  it('splits weekly month headers at actual month boundaries inside week columns', () => {
    const timeline = createTimeline(
      [task(new Date(2026, 6, 3), new Date(2026, 6, 8))],
      'weeks',
      new Date(2026, 6, 3),
    );

    const segments = getTimelineHeaderSegments(timeline, 'months');
    const july = segments.find((segment) => segment.label === 'Jul 2026');
    const julyStartX = dateToX(new Date(2026, 6, 1), timeline);
    const w27StartX = dateToX(new Date(2026, 5, 29), timeline);

    expect(july).toBeDefined();
    expect(july?.x).toBeCloseTo(julyStartX);
    expect(july!.x).toBeGreaterThan(w27StartX);
    expect(july!.x).toBeLessThan(w27StartX + timeline.colWidth);
  });

  it('positions month zoom dates using real calendar month lengths', () => {
    const timeline = createTimeline(
      [task(new Date(2026, 0, 31), new Date(2026, 2, 2))],
      'months',
      new Date(2026, 0, 1),
    );

    expect(dateToX(new Date(2026, 0, 1), timeline)).toBeCloseTo(0);
    expect(dateToX(new Date(2026, 1, 1), timeline)).toBeCloseTo(100);
    expect(dateToX(new Date(2026, 2, 1), timeline)).toBeCloseTo(200);
    expect(dateToX(new Date(2026, 0, 31), timeline)).toBeCloseTo((30 / 31) * 100);
    expect(dateToX(new Date(2026, 2, 2), timeline)).toBeCloseTo(200 + (1 / 31) * 100);
  });
});
