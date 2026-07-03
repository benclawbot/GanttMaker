import { format, isValid } from 'date-fns';

export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';

export function formatDisplayDate(date: Date): string {
  return format(date, DISPLAY_DATE_FORMAT);
}

export function parseDisplayDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (!isValid(parsed)) return null;
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}
