// Date generation + display formatting for the new-measure setup flow.
//
// A measure is created empty; the user picks a [start, end] range and an
// increment (daily / weekly / monthly), and we generate one MeasureRow
// per tick with `date` populated and `value` empty. The user then just
// fills in the values.
//
// All arithmetic happens in UTC to keep the date strings stable across
// timezones — these are date-only values, not instants.

import type { Increment, MeasureRow } from './types';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Parse a YYYY-MM-DD string into a UTC Date, or null if malformed.
 * Rejects dates with out-of-range components (e.g. month 13).
 */
function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject rolled-over dates like Feb 30 -> Mar 2.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeRow(date: string): MeasureRow {
  return {
    date,
    value: '',
    comment: { title: '', label: '', recalculate: false },
  };
}

/**
 * Generate one empty MeasureRow per tick between start and end (inclusive)
 * at the chosen increment. Returns `[]` for invalid or inverted ranges so
 * the UI can render a sensible "nothing yet" state instead of throwing.
 *
 * - daily   — every day from start through end
 * - weekly  — every 7 days from start (keeps the user's day-of-week)
 * - monthly — every first-of-month from start.month through end.month
 *             (the start/end day is ignored to give the user a clean
 *             "May, June, July" series regardless of which day they picked)
 */
export function generateDateRows(
  startISO: string,
  endISO: string,
  increment: Increment,
): MeasureRow[] {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end || end < start) return [];

  if (increment === 'monthly') {
    const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    const rows: MeasureRow[] = [];
    const cur = new Date(s);
    while (cur.getTime() <= e.getTime()) {
      rows.push(makeRow(formatISO(cur)));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return rows;
  }

  if (increment === 'yearly') {
    // Yearly snaps to 1 January of the start year through 1 January of
    // the end year. Mirrors the monthly behaviour of dropping the day.
    const s = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
    const e = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
    const rows: MeasureRow[] = [];
    const cur = new Date(s);
    while (cur.getTime() <= e.getTime()) {
      rows.push(makeRow(formatISO(cur)));
      cur.setUTCFullYear(cur.getUTCFullYear() + 1);
    }
    return rows;
  }

  const stepDays = increment === 'daily' ? 1 : 7;
  const rows: MeasureRow[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    rows.push(makeRow(formatISO(cur)));
    cur.setUTCDate(cur.getUTCDate() + stepDays);
  }
  return rows;
}

/**
 * Short, human-readable axis label for one date string at the given
 * increment. Falls back to the raw date string when the input is
 * malformed (so the chart at least shows something).
 *
 * The same formatter feeds the chart x-axis ticks and the editor's
 * date column for monthly measures, so the user sees one consistent
 * representation in both places.
 *
 * - daily   — "22 May" (year omitted to keep ticks short)
 * - weekly  — "22 May" (the week's start date)
 * - monthly — "May-2026"
 */
export function formatDateForAxis(iso: string, increment: Increment): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  if (increment === 'monthly') {
    const month = MONTH_SHORT[d.getUTCMonth()];
    return `${month}-${d.getUTCFullYear()}`;
  }
  if (increment === 'yearly') {
    return String(d.getUTCFullYear());
  }
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTH_SHORT[d.getUTCMonth()];
  return `${day} ${month}`;
}

/**
 * Today as YYYY-MM-DD in UTC. Centralised so the setup form and tests
 * agree on what "today" means.
 */
export function todayISO(): string {
  const now = new Date();
  return formatISO(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

/**
 * Shift an ISO date by a number of days. Used by the date-range slider
 * to compute the default end date from the start.
 */
export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return formatISO(d);
}

/**
 * Day-index of an ISO date relative to an epoch ISO date. Used by the
 * range slider to map between dates and slider values (which are
 * integers).
 */
export function daysSince(epochISO: string, iso: string): number {
  const epoch = parseISODate(epochISO);
  const target = parseISODate(iso);
  if (!epoch || !target) return 0;
  return Math.round((target.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * One increment forward from an ISO date — used by the editor's +Row
 * button so newly appended rows follow the measure's cadence.
 *
 * - daily   — +1 day
 * - weekly  — +7 days (keeps the day-of-week)
 * - monthly — +1 calendar month, day clamped to the new month's length
 *             (so 2026-01-31 + 1 month = 2026-02-28). The setup form
 *             generates monthly rows snapped to the 1st, in which case
 *             clamping is a no-op.
 *
 * Falls back to the input on malformed dates so the editor never crashes.
 */
export function nextDateAt(iso: string, increment: Increment): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  if (increment === 'monthly') {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const nextMonth = m + 1;
    // Last day of the target month — clamp the day to it.
    const lastOfNext = new Date(Date.UTC(y, nextMonth + 1, 0)).getUTCDate();
    return formatISO(new Date(Date.UTC(y, nextMonth, Math.min(day, lastOfNext))));
  }
  if (increment === 'yearly') {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    // Clamp Feb 29 in a non-leap year.
    const lastOfMonth = new Date(Date.UTC(y + 1, m + 1, 0)).getUTCDate();
    return formatISO(new Date(Date.UTC(y + 1, m, Math.min(day, lastOfMonth))));
  }
  const stepDays = increment === 'weekly' ? 7 : 1;
  d.setUTCDate(d.getUTCDate() + stepDays);
  return formatISO(d);
}

/**
 * Default span (in days) for the date-setup slider when the user picks
 * an increment. Picked so the default range is "long enough to be
 * useful" without overwhelming the user with thousands of rows.
 */
export function defaultSpanDaysForIncrement(increment: Increment): number {
  if (increment === 'daily') return 30; // ~one month of daily data
  if (increment === 'weekly') return 84; // 12 weeks
  if (increment === 'yearly') return 365 * 10; // 10 years
  return 365; // 12 monthly buckets
}
