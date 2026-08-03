import type { Dataset, RefreshConfig, DatasetRow } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function tryParseLabel(label: string, format: string): Date | null {
  const s = label.trim();
  if (format === 'MMM YYYY') {
    const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(s);
    if (m) {
      const mIdx = MONTHS.findIndex((mo) => mo.toLowerCase() === m[1].toLowerCase());
      if (mIdx >= 0) return new Date(Number(m[2]), mIdx, 1);
    }
    return null;
  }
  if (format === 'YYYY-MM') {
    const m = /^(\d{4})-(\d{2})$/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return null;
  }
  if (format === 'MM/YYYY') {
    const m = /^(\d{2})\/(\d{4})$/.exec(s);
    if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
    return null;
  }
  if (format === 'YYYY-MM-DD') {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function addInterval(date: Date, interval: RefreshConfig['periodInterval']): Date {
  const d = new Date(date);
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (interval === 'weekly') d.setDate(d.getDate() + 7);
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3);
  return d;
}

function formatLabel(date: Date, format: string): string {
  if (format === 'MMM YYYY') return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  if (format === 'YYYY-MM') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (format === 'MM/YYYY') return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  if (format === 'YYYY-MM-DD') return date.toISOString().slice(0, 10);
  return '';
}

export function nextPeriodLabel(dataset: Dataset, config: RefreshConfig): string {
  if (config.periodInterval === 'custom' || config.periodFormat === 'free') return '';
  const lastRow = dataset.rows[dataset.rows.length - 1];
  if (!lastRow) return '';
  const lastLabel = String(lastRow[config.periodColumn] ?? '').trim();
  if (!lastLabel) return '';
  const parsed = tryParseLabel(lastLabel, config.periodFormat);
  if (!parsed) return '';
  return formatLabel(addInterval(parsed, config.periodInterval), config.periodFormat);
}

export function lastPeriodValueFor(dataset: Dataset, column: string): string {
  for (let i = dataset.rows.length - 1; i >= 0; i--) {
    const v = dataset.rows[i][column];
    if (v !== null && v !== undefined && String(v) !== '') return String(v);
  }
  return '';
}

export function lastRefreshedAt(dataset: Dataset): string | null {
  for (let i = dataset.rows.length - 1; i >= 0; i--) {
    const v = dataset.rows[i]['_appendedAt'];
    if (v) return String(v);
  }
  return null;
}

export function appendPeriod(
  dataset: Dataset,
  periodLabel: string,
  values: Record<string, number | null>,
  config: RefreshConfig,
): Dataset {
  const newRow: DatasetRow = {
    [config.periodColumn]: periodLabel,
    ...values,
    _appendedAt: new Date().toISOString(),
  };
  return { ...dataset, rows: [...dataset.rows, newRow] };
}

export const PERIOD_FORMATS: Array<{ value: string; label: string }> = [
  { value: 'MMM YYYY', label: 'Jan 2025  (MMM YYYY)' },
  { value: 'YYYY-MM', label: '2025-01  (YYYY-MM)' },
  { value: 'MM/YYYY', label: '01/2025  (MM/YYYY)' },
  { value: 'YYYY-MM-DD', label: '2025-01-06  (ISO date)' },
  { value: 'free', label: 'Custom — type label each time' },
];
