import type { DatasetRow } from './types';

export type DateGrouping = 'none' | 'calMonth' | 'calYear' | 'fyYear' | 'fyQuarter' | 'fyMonth';

export const DATE_GROUPING_LABELS: Record<DateGrouping, string> = {
  none:      'As-is (no grouping)',
  calMonth:  'Calendar month (Jan 2025)',
  calYear:   'Calendar year (2025)',
  fyYear:    'Financial year (2025/26)',
  fyQuarter: 'Financial quarter (Q1 2025/26)',
  fyMonth:   'Financial month (M1 Apr)',
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseLenient(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO YYYY-MM-DD or YYYY-MM-DD hh:mm...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // MMM-YY or MMM YY/YYYY
  const mmmYY = s.match(/^([A-Za-z]{3})[\s\-](\d{2,4})$/);
  if (mmmYY) {
    const mi = MONTH_ABBR.findIndex((m) => m.toLowerCase() === mmmYY[1].toLowerCase());
    if (mi >= 0) {
      let yr = Number(mmmYY[2]);
      if (yr < 100) yr += yr < 50 ? 2000 : 1900;
      const d = new Date(yr, mi, 1);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  // MMM YYYY (e.g. "April 2025", "Apr 2025")
  const mmmFull = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (mmmFull) {
    const mi = MONTH_ABBR.findIndex((m) => mmmFull[1].toLowerCase().startsWith(m.toLowerCase()));
    if (mi >= 0) {
      const d = new Date(Number(mmmFull[2]), mi, 1);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  // YYYY/YY (financial year format in data — treat as Apr 1 of the first year)
  const fyFmt = s.match(/^(\d{4})\/(\d{2})$/);
  if (fyFmt) {
    const d = new Date(Number(fyFmt[1]), 3, 1); // Apr 1
    return isNaN(d.getTime()) ? null : d;
  }
  // Fallback: JS Date
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getFyYear(d: Date, fyStartMonth: number): number {
  const m = d.getMonth() + 1;
  return m < fyStartMonth ? d.getFullYear() - 1 : d.getFullYear();
}

function getFyMonth(d: Date, fyStartMonth: number): number {
  const m = d.getMonth() + 1;
  return ((m - fyStartMonth + 12) % 12) + 1;
}

function getFyQuarter(d: Date, fyStartMonth: number): number {
  return Math.ceil(getFyMonth(d, fyStartMonth) / 3);
}

function fyYearLabel(fyYear: number): string {
  return `${fyYear}/${String(fyYear + 1).slice(-2)}`;
}

function getSortKey(d: Date, grouping: DateGrouping, fyStartMonth: number): number {
  switch (grouping) {
    case 'calMonth':   return d.getFullYear() * 100 + d.getMonth();
    case 'calYear':    return d.getFullYear();
    case 'fyYear':     return getFyYear(d, fyStartMonth);
    case 'fyQuarter':  return getFyYear(d, fyStartMonth) * 10 + getFyQuarter(d, fyStartMonth);
    case 'fyMonth':    return getFyYear(d, fyStartMonth) * 100 + getFyMonth(d, fyStartMonth);
    default:           return 0;
  }
}

function getGroupLabel(d: Date, grouping: DateGrouping, fyStartMonth: number): string {
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  const fyYear = getFyYear(d, fyStartMonth);
  switch (grouping) {
    case 'calMonth':   return `${month} ${year}`;
    case 'calYear':    return String(year);
    case 'fyYear':     return fyYearLabel(fyYear);
    case 'fyQuarter':  return `Q${getFyQuarter(d, fyStartMonth)} ${fyYearLabel(fyYear)}`;
    case 'fyMonth':    return `M${getFyMonth(d, fyStartMonth)} ${month}`;
    default:           return '';
  }
}

export function applyDateGrouping(
  rows: DatasetRow[],
  xCol: string,
  yCols: string[],
  grouping: DateGrouping,
  fyStartMonth: number,
): DatasetRow[] {
  if (grouping === 'none' || !xCol) return rows;

  type Entry = { label: string; sortKey: number; totals: Record<string, number>; counts: Record<string, number> };
  const map = new Map<string, Entry>();

  for (const row of rows) {
    const raw = row[xCol];
    if (raw == null) continue;
    const d = parseLenient(String(raw));
    if (!d) continue;

    const label = getGroupLabel(d, grouping, fyStartMonth);
    const sortKey = getSortKey(d, grouping, fyStartMonth);

    if (!map.has(label)) map.set(label, { label, sortKey, totals: {}, counts: {} });
    const entry = map.get(label)!;

    for (const yCol of yCols) {
      const v = Number(row[yCol]);
      if (isFinite(v)) {
        entry.totals[yCol] = (entry.totals[yCol] ?? 0) + v;
        entry.counts[yCol] = (entry.counts[yCol] ?? 0) + 1;
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((entry) => {
      const out: DatasetRow = { [xCol]: entry.label };
      for (const yCol of yCols) {
        out[yCol] = entry.totals[yCol] ?? null;
      }
      return out;
    });
}
