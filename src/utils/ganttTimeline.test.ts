import { describe, expect, it } from 'vitest';
import { createTimeline, dateToX } from './ganttTimeline';
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
