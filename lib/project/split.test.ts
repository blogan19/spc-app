import { describe, expect, it } from 'vitest';
import { splitRows } from './split';
import type { MeasureRow } from './types';

const row = (date: string, value: string): MeasureRow => ({
  date,
  value,
  comment: { title: '', label: '', recalculate: false },
});

describe("splitRows kind='none'", () => {
  it('returns a single stratum containing every row', () => {
    const rows = [row('2025-01-01', '1'), row('2025-01-02', '2')];
    const out = splitRows(rows, 'none');
    expect(out).toHaveLength(1);
    expect(out[0].rows).toEqual(rows);
    expect(out[0].rows).not.toBe(rows); // returns a copy
  });
});

describe("splitRows kind='dayOfWeek'", () => {
  it('buckets by day-of-week, Mon first, omitting empty days', () => {
    // 2025-01-06 is Monday, 07 Tue, 08 Wed
    const rows = [
      row('2025-01-06', '1'), // Mon
      row('2025-01-07', '2'), // Tue
      row('2025-01-08', '3'), // Wed
      row('2025-01-13', '4'), // Mon
    ];
    const out = splitRows(rows, 'dayOfWeek');
    expect(out.map((s) => s.label)).toEqual(['Monday', 'Tuesday', 'Wednesday']);
    expect(out[0].rows.map((r) => r.date)).toEqual(['2025-01-06', '2025-01-13']);
  });

  it('places Sunday at the end of the week', () => {
    const rows = [
      row('2025-01-05', '1'), // Sun
      row('2025-01-06', '2'), // Mon
    ];
    const out = splitRows(rows, 'dayOfWeek');
    expect(out.map((s) => s.label)).toEqual(['Monday', 'Sunday']);
  });
});

describe("splitRows kind='weekdayWeekend'", () => {
  it('produces two strata in weekday-first order', () => {
    const rows = [
      row('2025-01-04', '1'), // Sat
      row('2025-01-06', '2'), // Mon
      row('2025-01-05', '3'), // Sun
    ];
    const out = splitRows(rows, 'weekdayWeekend');
    expect(out.map((s) => s.label)).toEqual(['Weekday', 'Weekend']);
    expect(out[0].rows[0].date).toBe('2025-01-06');
    expect(out[1].rows.map((r) => r.date).sort()).toEqual(['2025-01-04', '2025-01-05']);
  });

  it('omits the weekend stratum when no weekend rows exist', () => {
    const rows = [row('2025-01-06', '1'), row('2025-01-07', '2')];
    const out = splitRows(rows, 'weekdayWeekend');
    expect(out.map((s) => s.label)).toEqual(['Weekday']);
  });
});

describe("splitRows kind='month'", () => {
  it('buckets by month with January first', () => {
    const rows = [
      row('2025-03-15', '1'),
      row('2025-01-15', '2'),
      row('2025-12-15', '3'),
      row('2025-01-20', '4'),
    ];
    const out = splitRows(rows, 'month');
    expect(out.map((s) => s.label)).toEqual(['January', 'March', 'December']);
    expect(out[0].rows).toHaveLength(2);
  });
});

describe('splitRows edge cases', () => {
  it('skips rows with invalid dates', () => {
    const rows = [row('not-a-date', '1'), row('2025-01-06', '2')];
    const out = splitRows(rows, 'dayOfWeek');
    expect(out.flatMap((s) => s.rows.map((r) => r.date))).toEqual(['2025-01-06']);
  });

  it('returns no strata if every row has an invalid date', () => {
    const rows = [row('bad', '1'), row('worse', '2')];
    expect(splitRows(rows, 'dayOfWeek')).toEqual([]);
  });
});
