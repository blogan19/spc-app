// Pure CSV → MeasureRow pipeline. Browser file reading happens in the
// React component; everything here is sync and testable in node.

import Papa from 'papaparse';
import type { MeasureRow } from './types';

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  warnings: string[];
}

export interface ColumnMapping {
  date: string;
  value: string;
  /** Required for P/C/U charts; ignored for XmR/Run. */
  denominator?: string;
  commentTitle?: string;
  commentContent?: string;
}

/** Parse a CSV string with header row. Empty rows are skipped. */
export function parseCsv(input: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const warnings = result.errors.map((e) =>
    e.row !== undefined ? `Row ${e.row + 1}: ${e.message}` : e.message,
  );
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    warnings,
  };
}

// Month-name → 1-based month number. Covers both 3-letter abbreviations
// (the common spreadsheet form) and full month names. Case-insensitive
// — callers lowercase before lookup.
const MONTH_LOOKUP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Two-digit year → four-digit. Common-spreadsheet convention: assume
// the 21st century, so "24" → 2024. The wizard is for current-era data;
// users with pre-2000 records can use 4-digit years.
function expandYear(y: string): number {
  return y.length === 2 ? 2000 + Number(y) : Number(y);
}

function pad2(n: number | string): string {
  return String(n).padStart(2, '0');
}

/**
 * Normalise a date string to YYYY-MM-DD. Supported shapes (in priority
 * order so the most specific pattern wins):
 *
 *   - ISO              `2024-05-12`
 *   - ISO month        `2024-05`            → first of month
 *   - ISO quarter      `2024-Q2` / `2024 Q2` → first day of quarter
 *   - Reversed quarter `Q2 2024`
 *   - UK slash         `12/05/2024`         (always DD/MM/YYYY)
 *   - UK dash          `12-05-2024`
 *   - European dot     `12.05.2024`
 *   - Month-name DMY   `12-May-2024`, `12 May 2024`, `12/May/2024` (year may be 2- or 4-digit)
 *   - Month-name MY    `May-24`, `May 2024`, `May/2024`            → first of month
 *
 * Falls back to `Date.parse` only when the input contains a non-digit,
 * non-pattern character — bare numeric strings would otherwise be
 * mis-parsed as years by Chrome's legacy two-digit-year rule.
 *
 * Pass-through for anything else so the user can spot it in the preview.
 */
export function normalizeDate(input: string): string {
  const s = input.trim();
  if (s === '') return '';

  // ISO yyyy-mm-dd.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO yyyy-mm (snap to 1st).
  const isoMonth = s.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMonth) {
    const [, y, m] = isoMonth;
    return `${y}-${pad2(m)}-01`;
  }

  // YYYY[ -]Q[1-4]
  const yq = s.match(/^(\d{4})[\s-]?Q([1-4])$/i);
  if (yq) {
    const [, y, q] = yq;
    const month = (Number(q) - 1) * 3 + 1;
    return `${y}-${pad2(month)}-01`;
  }

  // Q[1-4][ -]YYYY
  const qy = s.match(/^Q([1-4])[\s-]?(\d{4})$/i);
  if (qy) {
    const [, q, y] = qy;
    const month = (Number(q) - 1) * 3 + 1;
    return `${y}-${pad2(month)}-01`;
  }

  // UK slash DD/MM/YYYY.
  const ukSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukSlash) {
    const [, d, m, y] = ukSlash;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // UK dash DD-MM-YYYY.
  const ukDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ukDash) {
    const [, d, m, y] = ukDash;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // European dot DD.MM.YYYY.
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) {
    const [, d, m, y] = dot;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // Day-Month-Year with a month name: "12-May-2024", "12 May 2024",
  // "12/May/24". Day must be 1-2 digits, month must be alphabetic,
  // year 2 or 4 digits.
  const dmyMonthName = s.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (dmyMonthName) {
    const [, d, monthStr, y] = dmyMonthName;
    const m = MONTH_LOOKUP[monthStr.toLowerCase()];
    if (m && (y.length === 2 || y.length === 4)) {
      return `${expandYear(y)}-${pad2(m)}-${pad2(d)}`;
    }
  }

  // Month-Year shorthand: "May-24", "May 2024", "May/24".
  const myMonthName = s.match(/^([A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (myMonthName) {
    const [, monthStr, y] = myMonthName;
    const m = MONTH_LOOKUP[monthStr.toLowerCase()];
    if (m && (y.length === 2 || y.length === 4)) {
      return `${expandYear(y)}-${pad2(m)}-01`;
    }
  }

  // Last-resort Date.parse fallback for natural-language strings
  // ("Jan 12 2024" etc.). Skip pure numeric strings — Chrome would
  // otherwise turn "2" into Jan 1 2002.
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    const ms = Date.parse(s);
    if (!Number.isNaN(ms)) {
      return new Date(ms).toISOString().substring(0, 10);
    }
  }
  return s;
}

/** Suggest a default mapping by keyword-matching headers. */
export function guessMapping(headers: readonly string[]): Partial<ColumnMapping> {
  const find = (...keywords: string[]) =>
    headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
  return {
    date: find('date', 'time', 'period', 'month'),
    value: find(
      'numerator',
      'events',
      'value',
      'measure',
      'rate',
      'count',
      'metric',
      'y',
    ),
    denominator: find('denominator', 'denom', 'exposure', 'sample', 'bed days', 'attendances', 'n_'),
    commentTitle: find('title', 'change', 'event', 'annotation', 'label'),
    commentContent: find('content', 'note', 'comment', 'description', 'detail'),
  };
}

/** Apply a column mapping to produce MeasureRow[]. */
export function applyMapping(parsed: ParsedCsv, mapping: ColumnMapping): MeasureRow[] {
  return parsed.rows.map((row) => ({
    date: normalizeDate(row[mapping.date] ?? ''),
    value: (row[mapping.value] ?? '').trim(),
    denominator: mapping.denominator
      ? (row[mapping.denominator] ?? '').trim()
      : undefined,
    comment: {
      title: mapping.commentTitle ? (row[mapping.commentTitle] ?? '').trim() : '',
      label: mapping.commentContent ? (row[mapping.commentContent] ?? '').trim() : '',
      recalculate: false,
    },
  }));
}

// --- validation -----------------------------------------------------------

export type IssueLevel = 'error' | 'warning';
export type IssueField = 'date' | 'value';

export interface ValidationIssue {
  level: IssueLevel;
  rowIndex?: number; // undefined for dataset-wide issues
  field?: IssueField;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** Worst severity flagged for each row index. Rows not present are clean. */
  rowLevel: Record<number, IssueLevel>;
  /** Row indices flagged as errors — handy for "drop invalid rows" flows. */
  errorRowIndices: number[];
}

const MIN_RECOMMENDED_POINTS = 12;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateImport(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rowLevel: Record<number, IssueLevel> = {};
  const errorRowIndices: number[] = [];
  const flag = (rowIndex: number, level: IssueLevel) => {
    // Worst severity wins.
    if (rowLevel[rowIndex] !== 'error') rowLevel[rowIndex] = level;
    if (level === 'error' && !errorRowIndices.includes(rowIndex)) {
      errorRowIndices.push(rowIndex);
    }
  };

  if (!mapping.date || !mapping.value) {
    return { issues, errorCount: 0, warningCount: 0, rowLevel: {}, errorRowIndices: [] };
  }

  const seenDates = new Set<string>();
  let previousDateMs: number | null = null;
  let outOfOrder = false;
  let validRowCount = 0;

  parsed.rows.forEach((row, i) => {
    const rawDate = (row[mapping.date] ?? '').trim();
    const rawValue = (row[mapping.value] ?? '').trim();

    // Date checks
    if (rawDate === '') {
      issues.push({ level: 'error', rowIndex: i, field: 'date', message: 'Date is empty' });
      flag(i, 'error');
    } else {
      const normalised = normalizeDate(rawDate);
      if (!ISO_DATE_RE.test(normalised)) {
        issues.push({
          level: 'error',
          rowIndex: i,
          field: 'date',
          message: `Date "${rawDate}" could not be parsed (expected YYYY-MM-DD or DD/MM/YYYY)`,
        });
        flag(i, 'error');
      } else {
        if (seenDates.has(normalised)) {
          issues.push({
            level: 'warning',
            rowIndex: i,
            field: 'date',
            message: `Duplicate date ${normalised}`,
          });
          flag(i, 'warning');
        }
        seenDates.add(normalised);

        const ms = Date.parse(normalised);
        if (previousDateMs !== null && ms < previousDateMs) outOfOrder = true;
        previousDateMs = ms;
      }
    }

    // Value checks
    if (rawValue === '') {
      issues.push({ level: 'error', rowIndex: i, field: 'value', message: 'Value is empty' });
      flag(i, 'error');
    } else {
      const n = Number(rawValue);
      if (!Number.isFinite(n)) {
        issues.push({
          level: 'error',
          rowIndex: i,
          field: 'value',
          message: `Value "${rawValue}" is not a number`,
        });
        flag(i, 'error');
      }
    }

    if (rowLevel[i] !== 'error') validRowCount++;
  });

  // Dataset-wide checks
  if (outOfOrder) {
    issues.push({
      level: 'warning',
      message: 'Dates are not in chronological order — rows will be sorted on import',
    });
  }
  if (parsed.rows.length > 0 && validRowCount < MIN_RECOMMENDED_POINTS) {
    issues.push({
      level: 'warning',
      message: `Only ${validRowCount} valid rows — XmR limits are less reliable below ${MIN_RECOMMENDED_POINTS} points`,
    });
  }

  return {
    issues,
    errorCount: issues.filter((i) => i.level === 'error').length,
    warningCount: issues.filter((i) => i.level === 'warning').length,
    rowLevel,
    errorRowIndices,
  };
}

export interface CleanOptions {
  dropInvalidRows?: boolean;
  sortByDate?: boolean;
}

/**
 * Produce the final MeasureRow[] for import. With the defaults — drop
 * invalid rows and sort by date — the output is always SPC-safe.
 */
export function cleanRows(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  validation: ValidationResult,
  options: CleanOptions = {},
): MeasureRow[] {
  const { dropInvalidRows = true, sortByDate = true } = options;
  const drop = new Set(dropInvalidRows ? validation.errorRowIndices : []);
  const mapped = applyMapping(parsed, mapping);
  const kept = mapped.filter((_, i) => !drop.has(i));
  if (!sortByDate) return kept;
  return [...kept].sort((a, b) => {
    if (a.date === b.date) return 0;
    return a.date < b.date ? -1 : 1;
  });
}
