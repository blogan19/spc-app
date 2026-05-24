import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysSince,
  defaultSpanDaysForIncrement,
  formatDateForAxis,
  generateDateRows,
  nextDateAt,
} from './dateRange';

describe('generateDateRows', () => {
  it('daily — generates one row per day inclusive', () => {
    const rows = generateDateRows('2026-05-22', '2026-05-26', 'daily');
    expect(rows.map((r) => r.date)).toEqual([
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
      '2026-05-26',
    ]);
  });

  it('daily — start equals end returns one row', () => {
    expect(generateDateRows('2026-05-22', '2026-05-22', 'daily')).toHaveLength(1);
  });

  it('weekly — steps by 7 days from the start date', () => {
    const rows = generateDateRows('2026-05-04', '2026-06-15', 'weekly');
    expect(rows.map((r) => r.date)).toEqual([
      '2026-05-04',
      '2026-05-11',
      '2026-05-18',
      '2026-05-25',
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
    ]);
  });

  it('weekly — preserves the start day-of-week (no Monday snapping)', () => {
    const rows = generateDateRows('2026-05-06', '2026-05-20', 'weekly');
    // Started on a Wednesday — every row should be a Wednesday.
    expect(rows.map((r) => r.date)).toEqual([
      '2026-05-06',
      '2026-05-13',
      '2026-05-20',
    ]);
  });

  it('monthly — snaps to first of month and steps by one calendar month', () => {
    const rows = generateDateRows('2026-05-22', '2026-08-10', 'monthly');
    expect(rows.map((r) => r.date)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
    ]);
  });

  it('monthly — crosses year boundaries', () => {
    const rows = generateDateRows('2026-11-15', '2027-02-15', 'monthly');
    expect(rows.map((r) => r.date)).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
    ]);
  });

  it('returns [] when end is before start', () => {
    expect(generateDateRows('2026-05-22', '2026-05-21', 'daily')).toEqual([]);
  });

  it('returns [] for malformed dates', () => {
    expect(generateDateRows('bogus', '2026-05-22', 'daily')).toEqual([]);
    expect(generateDateRows('2026-13-01', '2026-12-22', 'daily')).toEqual([]);
    // Reject rolled-over dates like Feb 30.
    expect(generateDateRows('2026-02-30', '2026-12-22', 'daily')).toEqual([]);
  });

  it('leap-year February — daily', () => {
    // 2024 is a leap year, so Feb 29 exists.
    const rows = generateDateRows('2024-02-28', '2024-03-01', 'daily');
    expect(rows.map((r) => r.date)).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });

  it('every row has empty value and the standard comment shape', () => {
    const rows = generateDateRows('2026-05-22', '2026-05-23', 'daily');
    expect(rows[0]).toEqual({
      date: '2026-05-22',
      value: '',
      comment: { title: '', label: '', recalculate: false },
    });
  });
});

describe('formatDateForAxis', () => {
  it('monthly — Month-YYYY (4-digit year)', () => {
    expect(formatDateForAxis('2026-05-01', 'monthly')).toBe('May-2026');
    expect(formatDateForAxis('2027-01-01', 'monthly')).toBe('Jan-2027');
  });

  it('daily / weekly — DD MMM', () => {
    expect(formatDateForAxis('2026-05-22', 'daily')).toBe('22 May');
    expect(formatDateForAxis('2026-05-22', 'weekly')).toBe('22 May');
  });

  it('falls back to raw input on malformed dates', () => {
    expect(formatDateForAxis('not-a-date', 'monthly')).toBe('not-a-date');
  });
});

describe('nextDateAt', () => {
  it('daily — adds one day', () => {
    expect(nextDateAt('2026-05-22', 'daily')).toBe('2026-05-23');
  });

  it('weekly — adds seven days, preserving day-of-week', () => {
    expect(nextDateAt('2026-05-22', 'weekly')).toBe('2026-05-29');
  });

  it('monthly — adds one calendar month', () => {
    expect(nextDateAt('2026-05-01', 'monthly')).toBe('2026-06-01');
    expect(nextDateAt('2026-12-01', 'monthly')).toBe('2027-01-01');
  });

  it('monthly — clamps day to the new month length', () => {
    // Jan 31 + 1 month → Feb 28 (not Mar 3 via overflow).
    expect(nextDateAt('2026-01-31', 'monthly')).toBe('2026-02-28');
    // Same in a leap year — Feb 29 is valid.
    expect(nextDateAt('2024-01-31', 'monthly')).toBe('2024-02-29');
  });

  it('monthly — handles year rollover', () => {
    expect(nextDateAt('2026-12-15', 'monthly')).toBe('2027-01-15');
  });

  it('falls back to input on malformed date', () => {
    expect(nextDateAt('not-a-date', 'monthly')).toBe('not-a-date');
  });
});

describe('defaultSpanDaysForIncrement', () => {
  it('matches the documented defaults', () => {
    expect(defaultSpanDaysForIncrement('daily')).toBe(30);
    expect(defaultSpanDaysForIncrement('weekly')).toBe(84);
    expect(defaultSpanDaysForIncrement('monthly')).toBe(365);
  });
});

describe('addDays / daysSince', () => {
  it('addDays — handles positive and negative offsets', () => {
    expect(addDays('2026-05-22', 1)).toBe('2026-05-23');
    expect(addDays('2026-05-22', -1)).toBe('2026-05-21');
    expect(addDays('2026-05-22', 30)).toBe('2026-06-21');
  });

  it('daysSince — round-trips with addDays', () => {
    expect(daysSince('2026-05-22', '2026-05-22')).toBe(0);
    expect(daysSince('2026-05-22', '2026-05-25')).toBe(3);
    expect(daysSince('2026-05-25', '2026-05-22')).toBe(-3);
  });

  it('daysSince — DST does not produce off-by-one (UTC arithmetic)', () => {
    // March DST transition in many locales; UTC should be unaffected.
    expect(daysSince('2026-03-01', '2026-04-01')).toBe(31);
  });
});
