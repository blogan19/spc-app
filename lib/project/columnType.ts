// Per-column type detection for the upload wizard. We need this to
// decide which columns can be assigned as X (must be dates) and which
// can be assigned as Y (must be numbers). A column is allowed to have
// a few bad cells — those become "fixable issues" the user can correct
// inline — so the classification uses a threshold rather than
// requiring 100% conformance.

import { normalizeDate } from './csv';

export type ColumnType = 'date' | 'numeric' | 'mixed' | 'text' | 'empty';

const PURE_THRESHOLD = 0.8;
// "Mixed" means the column is plausibly date- or number-shaped but has
// enough bad cells that the user needs to fix them first. If a column
// can't muster at least half conformance to either type, treat it as
// text/categorical instead — no Y/X assignment offered by default.
const SALVAGEABLE_THRESHOLD = 0.5;

export function looksLikeDate(value: string): boolean {
  if (!value) return false;
  const s = value.trim();
  if (!s) return false;
  // Reject bare integers like "2" or "13". Chrome's Date.parse happily
  // turns those into dates via legacy two-digit-year handling, which
  // would mis-classify count/event columns as date columns. The one
  // exception: a 4-digit integer in [1900, 2100] is treated as a year
  // so plain "year" columns can still drive the X axis.
  if (/^-?\d+$/.test(s)) {
    if (/^\d{4}$/.test(s)) {
      const year = Number(s);
      return year >= 1900 && year <= 2100;
    }
    return false;
  }
  // Decimals are never dates.
  if (/^-?\d+\.\d+$/.test(s)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizeDate(s));
}

export function looksLikeNumber(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  return Number.isFinite(Number(trimmed));
}

/**
 * Classify a column based on its values. Empty cells are skipped from
 * the conformance calculation — they don't count for or against. A
 * column with no non-empty cells returns 'empty'.
 */
export function classifyColumn(values: readonly string[]): ColumnType {
  const non = values.filter((v) => v != null && String(v).trim() !== '');
  if (non.length === 0) return 'empty';

  let dateOk = 0;
  let numOk = 0;
  for (const v of non) {
    const s = String(v);
    if (looksLikeDate(s)) dateOk += 1;
    if (looksLikeNumber(s)) numOk += 1;
  }
  const datePct = dateOk / non.length;
  const numPct = numOk / non.length;

  // Pure cases first.
  if (datePct >= PURE_THRESHOLD && numPct < PURE_THRESHOLD) return 'date';
  if (numPct >= PURE_THRESHOLD && datePct < PURE_THRESHOLD) return 'numeric';
  // Ambiguous ("2024", "2025" parse as both): prefer 'date' if it has
  // a 4-digit year + month + day shape detected at the high threshold.
  if (datePct >= PURE_THRESHOLD) return 'date';
  if (numPct >= PURE_THRESHOLD) return 'numeric';
  // Mixed = recoverable: at least half the cells look like one shape,
  // the rest are fixable via the issues panel.
  if (datePct >= SALVAGEABLE_THRESHOLD || numPct >= SALVAGEABLE_THRESHOLD) return 'mixed';
  return 'text';
}

export interface CellIssue {
  rowIndex: number; // 0-based index into the original parsed rows
  header: string;
  rawValue: string;
  reason: 'invalid_date' | 'invalid_number';
}

/**
 * Find every row in the value column whose entry can't be coerced to a
 * finite number (excluding empties — those are gaps, not errors).
 * Mirrors the same idea for the date column. The wizard surfaces these
 * as editable fix-up cards so the user can patch them in place.
 */
export function findCellIssues(
  rows: ReadonlyArray<Record<string, string>>,
  dateCol: string | undefined,
  valueCol: string | undefined,
): CellIssue[] {
  const out: CellIssue[] = [];
  rows.forEach((row, i) => {
    if (dateCol) {
      const raw = (row[dateCol] ?? '').trim();
      if (raw !== '' && !looksLikeDate(raw)) {
        out.push({ rowIndex: i, header: dateCol, rawValue: raw, reason: 'invalid_date' });
      }
    }
    if (valueCol) {
      const raw = (row[valueCol] ?? '').trim();
      if (raw !== '' && !looksLikeNumber(raw)) {
        out.push({ rowIndex: i, header: valueCol, rawValue: raw, reason: 'invalid_number' });
      }
    }
  });
  return out;
}
