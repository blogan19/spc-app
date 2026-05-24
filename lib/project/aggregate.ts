// Aggregate a flat MeasureRow[] into one row per increment bucket. The
// setup-time upload flow uses this when the user's spreadsheet is finer
// than the chart's chosen cadence (e.g. daily rows on a monthly chart)
// or has multiple readings for the same date. Pure helpers — no DOM, no
// React, fully testable.

import type { Increment, MeasureRow } from './types';

export type Aggregator = 'sum' | 'mean' | 'max' | 'min' | 'first' | 'last';

export const AGGREGATOR_LABELS: Record<Aggregator, string> = {
  sum: 'Sum',
  mean: 'Average (mean)',
  max: 'Highest',
  min: 'Lowest',
  first: 'First',
  last: 'Latest',
};

export const AGGREGATOR_HINTS: Record<Aggregator, string> = {
  sum: 'Add the values together (e.g. count of events over the bucket)',
  mean: 'Take the average of the values (e.g. % compliance averaged over the bucket)',
  max: 'Keep the highest value seen in the bucket',
  min: 'Keep the lowest value seen in the bucket',
  first: 'Keep the first row in the bucket; ignore the rest',
  last: 'Keep the most recent row in the bucket; ignore the rest',
};

/**
 * Snap a date to the start of its increment bucket. Monthly → 1st of
 * the month, Weekly → the Monday of that week (ISO), Daily → unchanged.
 * Operates on a string; passes through anything we can't parse so the
 * caller can flag it.
 */
export function bucketFor(dateISO: string, increment: Increment): string {
  // Match the parsing rules used by lib/project/dateRange.ts: parse as
  // UTC components rather than via Date constructor (which would apply
  // local-time offsets and shift "2026-05-01" by hours).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO.trim());
  if (!m) return dateISO;
  const [, ys, ms, ds] = m;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (increment === 'daily') return dateISO;
  if (increment === 'monthly') {
    return `${ys}-${ms}-01`;
  }
  if (increment === 'yearly') {
    return `${ys}-01-01`;
  }
  // Weekly — snap to the Monday of the ISO week the row belongs to.
  const date = new Date(Date.UTC(y, mo - 1, d));
  const dow = date.getUTCDay(); // 0=Sun .. 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

interface NumericGroup {
  bucket: string;
  rows: MeasureRow[]; // original rows, ordered as they appeared in input
}

/**
 * Group rows by their increment bucket, preserving input order inside
 * each group. Rows whose date doesn't parse fall under a synthetic
 * '__unparsed__' bucket so they're not silently dropped.
 */
function groupByBucket(
  rows: readonly MeasureRow[],
  increment: Increment,
): NumericGroup[] {
  const order: string[] = [];
  const map = new Map<string, MeasureRow[]>();
  for (const row of rows) {
    const bucket = row.date ? bucketFor(row.date, increment) : '';
    const key = bucket || '__unparsed__';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(row);
  }
  return order.map((key) => ({ bucket: key, rows: map.get(key)! }));
}

export interface AggregationStats {
  /** Number of buckets containing more than one input row. */
  bucketsWithDuplicates: number;
  /** Total input rows whose date falls into a bucket with siblings. */
  rowsInDuplicateBuckets: number;
  /** Distinct buckets present in the input — also the row count post-aggregation. */
  bucketCount: number;
  /** Input rows. */
  inputCount: number;
}

/** Pre-flight: tell the user how much rolling up will actually happen. */
export function aggregationStats(
  rows: readonly MeasureRow[],
  increment: Increment,
): AggregationStats {
  const groups = groupByBucket(rows, increment);
  let bucketsWithDuplicates = 0;
  let rowsInDuplicateBuckets = 0;
  for (const g of groups) {
    if (g.rows.length > 1) {
      bucketsWithDuplicates += 1;
      rowsInDuplicateBuckets += g.rows.length;
    }
  }
  return {
    bucketsWithDuplicates,
    rowsInDuplicateBuckets,
    bucketCount: groups.length,
    inputCount: rows.length,
  };
}

function combineNumeric(values: number[], agg: Aggregator): number {
  if (values.length === 0) return NaN;
  switch (agg) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'mean':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'first':
      return values[0];
    case 'last':
      return values[values.length - 1];
  }
}

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  // Trim trailing zeros so a mean of 4.0 doesn't show as "4.000".
  return Number(n.toFixed(6)).toString();
};

/**
 * Roll the input rows up to one row per bucket. Empty / non-numeric
 * values are dropped before aggregation; if a bucket ends up with no
 * numeric values it's still kept but its value is blank (useful so a
 * sparse spreadsheet still produces the right number of x-axis points).
 *
 * Comments are simplified: the first non-empty title/label in the
 * bucket wins. The `recalculate` flag is set if any input row in the
 * bucket had it.
 */
export function aggregateRows(
  rows: readonly MeasureRow[],
  increment: Increment,
  agg: Aggregator,
): MeasureRow[] {
  const groups = groupByBucket(rows, increment);
  return groups.map((g) => {
    const bucket = g.bucket === '__unparsed__' ? '' : g.bucket;
    const numericValues: number[] = [];
    const numericDenominators: number[] = [];
    let titleSeed = '';
    let labelSeed = '';
    let recalculate = false;
    let lockedAtSeed: string | undefined;
    for (const row of g.rows) {
      const v = Number(row.value);
      if (Number.isFinite(v)) numericValues.push(v);
      if (row.denominator !== undefined && row.denominator !== '') {
        const dn = Number(row.denominator);
        if (Number.isFinite(dn)) numericDenominators.push(dn);
      }
      if (!titleSeed && row.comment?.title) titleSeed = row.comment.title;
      if (!labelSeed && row.comment?.label) labelSeed = row.comment.label;
      if (row.comment?.recalculate) recalculate = true;
      if (!lockedAtSeed && row.comment?.lockedAt) lockedAtSeed = row.comment.lockedAt;
    }
    return {
      date: bucket,
      value: numericValues.length === 0 ? '' : fmt(combineNumeric(numericValues, agg)),
      // Denominators sum for P/U/Funnel — that's the only aggregation
      // that makes statistical sense regardless of how the user wants
      // to combine numerators. We could expose it later if it turns
      // out users need something else.
      denominator:
        numericDenominators.length === 0
          ? undefined
          : fmt(numericDenominators.reduce((a, b) => a + b, 0)),
      comment: {
        title: titleSeed,
        label: labelSeed,
        recalculate,
        ...(lockedAtSeed ? { lockedAt: lockedAtSeed } : {}),
      },
    };
  });
}
