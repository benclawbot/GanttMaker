import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachWeekOfInterval,
  eachYearOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import type { Task, ZoomLevel } from '../types';

export interface TimelineColumn {
  date: Date;
  startDate: Date;
  endDate: Date;
  width: number;
}

export interface TimelineInfo {
  dates: Date[];
  columns: TimelineColumn[];
  colWidth: number;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalWidth: number;
}

export interface TimelineGuide {
  date: Date;
  x: number;
  label: string;
  isMajor: boolean;
}

export function formatTimelineColumnLabel(date: Date, zoomLevel: ZoomLevel): string {
  switch (zoomLevel) {
    case 'days':
      return format(date, 'dd');
    case 'weeks':
      return `W${format(date, 'w')}`;
    case 'months':
      return format(date, 'MMM');
    case 'quarters':
      return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    case 'years':
      return format(date, 'yyyy');
  }
}

type ZoomConfig = {
  colWidth: number;
  startOfPeriod: (date: Date) => Date;
  nextPeriod: (date: Date) => Date;
  eachPeriod: (interval: { start: Date; end: Date }) => Date[];
};

function configForZoom(zoomLevel: ZoomLevel): ZoomConfig {
  switch (zoomLevel) {
    case 'days':
      return {
        colWidth: 30,
        startOfPeriod: startOfDay,
        nextPeriod: (date) => addDays(date, 1),
        eachPeriod: eachDayOfInterval,
      };
    case 'weeks':
      return {
        colWidth: 80,
        startOfPeriod: (date) => startOfWeek(date, { weekStartsOn: 1 }),
        nextPeriod: (date) => addWeeks(date, 1),
        eachPeriod: (interval) => eachWeekOfInterval(interval, { weekStartsOn: 1 }),
      };
    case 'months':
      return {
        colWidth: 100,
        startOfPeriod: startOfMonth,
        nextPeriod: (date) => addMonths(date, 1),
        eachPeriod: eachMonthOfInterval,
      };
    case 'quarters':
      return {
        colWidth: 120,
        startOfPeriod: startOfQuarter,
        nextPeriod: (date) => addQuarters(date, 1),
        eachPeriod: eachQuarterOfInterval,
      };
    case 'years':
      return {
        colWidth: 150,
        startOfPeriod: startOfYear,
        nextPeriod: (date) => addYears(date, 1),
        eachPeriod: eachYearOfInterval,
      };
  }
}

export function createTimeline(
  tasks: Task[],
  zoomLevel: ZoomLevel,
  today: Date = new Date(),
): TimelineInfo {
  const config = configForZoom(zoomLevel);
  const baseDate = startOfDay(today);

  const minDate = tasks.length
    ? new Date(Math.min(...tasks.map((task) => task.startDate.getTime())))
    : addDays(baseDate, -7);
  const maxDate = tasks.length
    ? new Date(Math.max(...tasks.map((task) => task.endDate.getTime())))
    : addDays(baseDate, 60);

  const paddedStart = addDays(startOfDay(minDate), -7);
  const paddedEnd = addDays(startOfDay(maxDate), 14);
  const startDate = config.startOfPeriod(paddedStart);
  const lastPeriodStart = config.startOfPeriod(paddedEnd);
  const endDate = config.nextPeriod(lastPeriodStart);
  const dates = config.eachPeriod({ start: startDate, end: paddedEnd });
  const columns = dates.map((date, index) => ({
    date,
    startDate: date,
    endDate: index + 1 < dates.length ? dates[index + 1] : endDate,
    width: config.colWidth,
  }));
  const totalWidth = columns.reduce((width, column) => width + column.width, 0);

  return {
    dates,
    columns,
    colWidth: config.colWidth,
    startDate,
    endDate,
    totalDays: differenceInCalendarDays(endDate, startDate),
    totalWidth,
  };
}

export function dateToX(date: Date, timeline: TimelineInfo): number {
  const target = startOfDay(date);
  let offset = 0;

  if (target < timeline.startDate) {
    const first = timeline.columns[0];
    if (!first) return 0;
    const firstDays = Math.max(1, differenceInCalendarDays(first.endDate, first.startDate));
    return differenceInCalendarDays(target, timeline.startDate) * (first.width / firstDays);
  }

  for (const column of timeline.columns) {
    if (target >= column.startDate && target < column.endDate) {
      const daysInColumn = Math.max(1, differenceInCalendarDays(column.endDate, column.startDate));
      const daysFromColumnStart = differenceInCalendarDays(target, column.startDate);
      return offset + daysFromColumnStart * (column.width / daysInColumn);
    }
    offset += column.width;
  }

  const last = timeline.columns[timeline.columns.length - 1];
  if (!last) return 0;
  const lastDays = Math.max(1, differenceInCalendarDays(last.endDate, last.startDate));
  return timeline.totalWidth + differenceInCalendarDays(target, timeline.endDate) * (last.width / lastDays);
}

export function getPixelsPerDayAtDate(date: Date, timeline: TimelineInfo): number {
  const target = startOfDay(date);
  const column = timeline.columns.find((item) => target >= item.startDate && target < item.endDate)
    || timeline.columns[0];
  if (!column) return 1;

  const daysInColumn = Math.max(1, differenceInCalendarDays(column.endDate, column.startDate));
  return column.width / daysInColumn;
}

export function getTimelineGuides(timeline: TimelineInfo, zoomLevel: ZoomLevel): TimelineGuide[] {
  const guides: TimelineGuide[] = [];
  const pushGuide = (date: Date, label: string, isMajor = false) => {
    if (date < timeline.startDate || date >= timeline.endDate) return;
    guides.push({ date, x: dateToX(date, timeline), label, isMajor });
  };

  if (zoomLevel === 'days') {
    timeline.columns.forEach((column) => {
      pushGuide(column.startDate, format(column.startDate, 'dd/MM'), true);
    });
    return guides;
  }

  if (zoomLevel === 'weeks') {
    timeline.columns.forEach((column) => {
      let cursor = column.startDate;
      while (cursor < column.endDate) {
        pushGuide(cursor, format(cursor, 'dd/MM'), cursor.getDay() === 1);
        cursor = addDays(cursor, 1);
      }
    });
    return guides;
  }

  if (zoomLevel === 'months') {
    timeline.columns.forEach((column) => {
      let cursor = column.startDate;
      while (cursor < column.endDate) {
        pushGuide(cursor, format(cursor, 'dd/MM'), cursor.getDate() === 1);
        cursor = addWeeks(cursor, 1);
      }
    });
    return guides;
  }

  if (zoomLevel === 'quarters' || zoomLevel === 'years') {
    timeline.columns.forEach((column) => {
      let cursor = column.startDate;
      while (cursor < column.endDate) {
        pushGuide(cursor, format(cursor, 'dd/MM'), true);
        cursor = addMonths(cursor, 1);
      }
    });
  }

  return guides;
}
