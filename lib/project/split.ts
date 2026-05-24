// Sub-process split. Buckets a measure's rows by a date-derived stratifier
// so a single dataset can be rendered as N separate charts. The MDC
// alternative to rolling averages (Strengthening Your Decisions, §"Dealing
// with data relating to more than one process").

import type { MeasureRow, SplitKind } from './types';
export type { SplitKind };

export interface SplitOption {
  kind: SplitKind;
  label: string;
  description: string;
}

export const splitOptions: SplitOption[] = [
  { kind: 'none', label: 'None', description: 'One chart for the whole series' },
  {
    kind: 'dayOfWeek',
    label: 'Day of week',
    description: 'Up to 7 charts — Mon..Sun. Surfaces day-pattern effects.',
  },
  {
    kind: 'weekdayWeekend',
    label: 'Weekday vs weekend',
    description: 'Two charts — the most common MDC split.',
  },
  {
    kind: 'month',
    label: 'Month of year',
    description: 'Up to 12 charts. Surfaces seasonal effects.',
  },
];

export interface SplitStratum {
  label: string;
  rows: MeasureRow[];
}

const dayLabels = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface Bucket {
  label: string;
  order: number;
  rows: MeasureRow[];
}

/**
 * Group rows into strata using the chosen kind. Returns each non-empty
 * stratum in a deterministic order (Mon-first for days, weekday-first
 * for weekday/weekend, Jan-first for months). Rows with unparseable
 * dates are skipped.
 */
export function splitRows(rows: readonly MeasureRow[], kind: SplitKind): SplitStratum[] {
  if (kind === 'none') return [{ label: '', rows: [...rows] }];

  const groups = new Map<string, Bucket>();

  for (const row of rows) {
    const d = new Date(row.date);
    if (Number.isNaN(d.getTime())) continue;

    let key: string;
    let label: string;
    let order: number;

    if (kind === 'dayOfWeek') {
      const day = d.getUTCDay();
      key = `dow-${day}`;
      label = dayLabels[day];
      // Monday=1 first, Sunday=0 last.
      order = day === 0 ? 7 : day;
    } else if (kind === 'weekdayWeekend') {
      const day = d.getUTCDay();
      const isWeekend = day === 0 || day === 6;
      key = isWeekend ? 'we' : 'wd';
      label = isWeekend ? 'Weekend' : 'Weekday';
      order = isWeekend ? 1 : 0;
    } else {
      // month
      const m = d.getUTCMonth();
      key = `month-${m}`;
      label = monthLabels[m];
      order = m;
    }

    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { label, order, rows: [] };
      groups.set(key, bucket);
    }
    bucket.rows.push(row);
  }

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map(({ label, rows: stratumRows }) => ({ label, rows: stratumRows }));
}
