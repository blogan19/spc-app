// CSV export for a measure. Mirrors the import surface so the file can
// round-trip back through the spreadsheet upload. Adds computed columns
// (mean / median / UCL / LCL / rule hits / variation icon) so the file
// is a snapshot of the full analysis, not just the raw inputs.

import { analyseSpc, deriveIcons } from '@/lib/spc';
import type { Measure } from './types';

const ESCAPE_RE = /[",\n]/;

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  if (ESCAPE_RE.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  'date',
  'value',
  'denominator',
  'plotted_value',
  'mean',
  'median',
  'ucl',
  'lcl',
  'variation',
  'rules',
  'phase_start',
  'comment_title',
  'comment_content',
  'comment_locked_at',
];

/**
 * Build a CSV string for a measure. Returns null if the measure has no
 * analysable rows (e.g. only blank dates).
 */
export function exportMeasureToCsv(measure: Measure): string | null {
  const kind = (['RunChart', 'P', 'C', 'U'] as const).includes(
    measure.chartKind as 'RunChart' | 'P' | 'C' | 'U',
  )
    ? (measure.chartKind as 'RunChart' | 'P' | 'C' | 'U')
    : ('XmR' as const);

  // Only attribute / control charts are time-series. Pareto / Funnel get
  // a simpler export that just dumps the editor rows; analysis columns
  // are blank because they don't apply.
  const isTimeSeries = !['Pareto', 'Funnel'].includes(measure.chartKind);

  const sourceRows = measure.data
    .filter((d) => d?.date)
    .map((d) => ({
      raw: d,
      coerced: {
        date: d.date,
        value: Number(d.value),
        denominator:
          d?.denominator !== undefined && d?.denominator !== ''
            ? Number(d.denominator)
            : undefined,
        recalculate: Boolean(d?.comment?.recalculate),
      },
    }));
  if (sourceRows.length === 0) return null;

  // For time-series kinds, drop rows without a numeric value before
  // running the analysis. Keep them in the output as blank-analysis rows
  // so the user can see where their data has gaps.
  const analysableRows = sourceRows
    .map((r) => r.coerced)
    .filter((r) => Number.isFinite(r.value));
  const { analysis, plottedRows } = isTimeSeries
    ? analyseSpc(analysableRows, { kind })
    : { analysis: null, plottedRows: [] as ReturnType<typeof analyseSpc>['plottedRows'] };
  const icons = analysis ? deriveIcons(plottedRows, analysis, measure.aim, measure.target) : null;

  // Map analysable-row index → original-row index, so we can stamp
  // analysis columns onto the right rows even when some inputs were
  // skipped because they had no numeric value.
  const indexMap = new Map<number, number>();
  let analysableIdx = 0;
  sourceRows.forEach((r, originalIdx) => {
    if (Number.isFinite(r.coerced.value)) {
      indexMap.set(originalIdx, analysableIdx);
      analysableIdx += 1;
    }
  });

  // Build a per-row list of rule names so the user can see which row
  // triggered which rule.
  const rulesFor = (analysableI: number): string => {
    if (!analysis) return '';
    const hits: string[] = [];
    const r = analysis.rules;
    if (r.outsideLimits.includes(analysableI)) hits.push('outside_limits');
    if (r.runAboveBelowMean.includes(analysableI)) hits.push('run_above_below_mean');
    if (r.increasingRun.includes(analysableI)) hits.push('increasing_run');
    if (r.decreasingRun.includes(analysableI)) hits.push('decreasing_run');
    if (r.twoOfThreeOuterThird.includes(analysableI)) hits.push('two_of_three_outer_third');
    return hits.join(';');
  };

  const lines: string[] = [];
  // Metadata header — comment lines start with `#` and are ignored by
  // most CSV readers, but stay machine-readable if a downstream tool
  // wants them.
  lines.push(`# measure_name: ${csvCell(measure.name)}`);
  lines.push(`# chart_kind: ${csvCell(measure.chartKind)}`);
  lines.push(`# aim: ${csvCell(measure.aim)}`);
  if (measure.target !== undefined) lines.push(`# target: ${csvCell(measure.target)}`);
  if (icons) lines.push(`# variation: ${csvCell(icons.variation)}`);
  if (icons?.assurance) lines.push(`# assurance: ${csvCell(icons.assurance)}`);

  lines.push(HEADERS.map(csvCell).join(','));

  sourceRows.forEach((r, originalIdx) => {
    const analysableI = indexMap.get(originalIdx);
    const limits =
      analysableI !== undefined && analysis ? analysis.pointLimits[analysableI] : undefined;
    const plotted =
      analysableI !== undefined && plottedRows[analysableI]
        ? plottedRows[analysableI].value
        : undefined;
    const variationLabel = icons?.variation ?? '';

    const row = [
      r.raw.date ?? '',
      r.raw.value ?? '',
      r.raw.denominator ?? '',
      plotted !== undefined && Number.isFinite(plotted) ? plotted : '',
      limits ? limits.mean : '',
      limits ? limits.median : '',
      limits ? limits.ucl : '',
      limits ? limits.lcl : '',
      // Variation is per-chart, not per-row. Stamp it on the latest row
      // so a downstream reader sees it next to the most-recent data
      // without scanning the header comments.
      analysableI === analysableRows.length - 1 ? variationLabel : '',
      analysableI !== undefined ? rulesFor(analysableI) : '',
      r.raw.comment?.recalculate ? 'true' : '',
      r.raw.comment?.title ?? '',
      r.raw.comment?.label ?? '',
      r.raw.comment?.lockedAt ?? '',
    ];
    lines.push(row.map(csvCell).join(','));
  });

  return lines.join('\n');
}

/**
 * Trigger a CSV download in the browser. No-op server-side.
 */
export function downloadMeasureCsv(measure: Measure): void {
  if (typeof window === 'undefined') return;
  const text = exportMeasureToCsv(measure);
  if (!text) return;
  const safeName = (measure.name || 'measure').replace(/[^a-z0-9\-_]+/gi, '_');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
