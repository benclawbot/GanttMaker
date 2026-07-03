import { describe, expect, it } from 'vitest';
import { formatDisplayDate, parseDisplayDate } from './dates';

describe('display dates', () => {
  it('formats dates as dd/MM/yyyy', () => {
    expect(formatDisplayDate(new Date(2026, 6, 3))).toBe('03/07/2026');
  });

  it('parses dd/MM/yyyy dates at local midnight', () => {
    const parsed = parseDisplayDate('03/07/2026');

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(3);
    expect(parsed?.getHours()).toBe(0);
  });

  it('rejects non-display date formats and impossible dates', () => {
    expect(parseDisplayDate('2026-07-03')).toBeNull();
    expect(parseDisplayDate('31/02/2026')).toBeNull();
  });
});
