// Suggestions for the new-chart setup screen when the user drops a
// spreadsheet. The aim is to skip as much typing as possible: derive a
// title from the filename, axis labels from the chosen columns, and a
// cadence from the actual gaps between dates.

import { aggregationStats } from './aggregate';
import type { Increment, MeasureRow } from './types';

// Rule of thumb: an SPC chart reads cleanly with about 12–60 data
// points. Above ~60 the axis ticks get crowded and the user is usually
// better off aggregating; below ~12 the limits aren't reliable.
//
// Two thresholds, applied in order:
//   - PREFERRED_MAX_NATURAL — if the user's natural cadence already
//     fits under this, leave it alone (don't force aggregation).
//   - PREFERRED_MAX_AGGREGATED — once we've decided to roll up, keep
//     bumping coarser until we drop under this lower bar. Stops daily
//     365-row data from landing on weekly (52 rows) when monthly
//     (~12 rows) is the conventional choice.
const PREFERRED_MAX_NATURAL = 60;
const PREFERRED_MAX_AGGREGATED = 36;

/**
 * Turn `falls_per_1000_obd-2026.csv` into "Falls Per 1000 OBD 2026".
 * Keeps the user-readable bits and drops the extension; sentence case
 * would feel too aggressive given how often filenames are abbreviations.
 */
export function suggestTitleFromFilename(filename: string): string {
  if (!filename) return '';
  const noExt = filename.replace(/\.[^.]+$/, '');
  const cleaned = noExt
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Estimate the natural cadence of a row set by looking at the median
 * gap between consecutive dates. Conservative ranges — the user can
 * still flip the increment manually if the suggestion is wrong.
 */
export function detectIncrement(rows: readonly MeasureRow[]): Increment | null {
  if (rows.length < 2) return null;
  const isoOnly = rows
    .map((r) => r.date)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (isoOnly.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < isoOnly.length; i++) {
    const [ya, ma, da] = isoOnly[i - 1].split('-').map(Number);
    const [yb, mb, db] = isoOnly[i].split('-').map(Number);
    const a = Date.UTC(ya, ma - 1, da);
    const b = Date.UTC(yb, mb - 1, db);
    const gap = Math.round((b - a) / (24 * 60 * 60 * 1000));
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length === 0) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median =
    mid % 1 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)];

  if (median <= 2) return 'daily';
  if (median <= 10) return 'weekly';
  if (median <= 45) return 'monthly';
  if (median >= 300) return 'yearly';
  // Anything between ~45 and 300 days is unusual — default to monthly
  // since SPC charts are most often monthly in healthcare.
  return 'monthly';
}

const ORDER: Increment[] = ['daily', 'weekly', 'monthly', 'yearly'];

const INCREMENT_LABEL: Record<Increment, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
};

export interface IncrementSuggestion {
  /** Natural cadence of the input rows (median gap between dates). */
  natural: Increment;
  /** Cadence the chart should actually use. */
  suggested: Increment;
  /** Row count once aggregated to the suggested cadence. */
  suggestedRowCount: number;
  /**
   * True when `suggested` is coarser than `natural` — i.e. we'll need
   * to aggregate the input rows before plotting. The UI uses this to
   * decide whether to surface the aggregation choice.
   */
  willAggregate: boolean;
  /** One-line plain-English explanation aimed at the user. */
  message: string;
}

/**
 * Pick the cadence that gives the cleanest SPC chart for the rows the
 * user dropped. Returns the natural cadence as well so the UI can
 * explain what was changed and why. Falls back to `null` when the
 * input doesn't contain enough valid dates to make any call.
 */
export function suggestIncrementForData(
  rows: readonly MeasureRow[],
): IncrementSuggestion | null {
  const natural = detectIncrement(rows);
  if (!natural || rows.length === 0) return null;

  // First check: does the natural cadence already fit? If yes, we're
  // done — no point aggregating fresh-looking data.
  const naturalCount = aggregationStats(rows, natural).bucketCount;
  let suggested: Increment = natural;
  let count = naturalCount;
  if (naturalCount > PREFERRED_MAX_NATURAL) {
    // Need to aggregate. Walk coarser until we hit the lower bar.
    const startIdx = ORDER.indexOf(natural);
    for (let i = startIdx + 1; i < ORDER.length; i++) {
      const inc = ORDER[i];
      const stats = aggregationStats(rows, inc);
      suggested = inc;
      count = stats.bucketCount;
      if (count <= PREFERRED_MAX_AGGREGATED) break;
    }
  }

  const willAggregate = suggested !== natural;
  let message: string;
  if (!willAggregate) {
    message = `Your data looks ${INCREMENT_LABEL[natural]} — using that. (${count} row${
      count === 1 ? '' : 's'
    })`;
  } else {
    message = `Your data is ${INCREMENT_LABEL[natural]}, but ${rows.length} rows is too many to plot cleanly — we'll roll it up to ${INCREMENT_LABEL[suggested]} (about ${count} row${
      count === 1 ? '' : 's'
    }).`;
  }
  return {
    natural,
    suggested,
    suggestedRowCount: count,
    willAggregate,
    message,
  };
}
