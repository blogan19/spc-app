import { detectRules } from './rules';
import { computeSegments } from './segments';
import { analyseProportion } from './pchart';
import { analyseCount, analyseRate } from './count';
import type { AnalysisKind, SpcAnalysis, SpcRow } from './types';

export * from './types';
export { mean, median, movingRanges, xmrLimits, runChartCentre } from './xmr';
export { computeSegments } from './segments';
export { detectRules } from './rules';
export { analyseProportion } from './pchart';
export { analyseCount, analyseRate } from './count';
export { analysePareto } from './pareto';
export type {
  ParetoAnalysis,
  ParetoCategory,
  ParetoInputCategory,
  ParetoOptions,
} from './pareto';
export { analyseFunnel } from './funnel';
export type {
  FunnelAnalysis,
  FunnelCurvePoint,
  FunnelInputUnit,
  FunnelOptions,
  FunnelUnit,
} from './funnel';
export {
  alignByDate,
  laggedCorrelation,
  peakLag,
  pearson,
} from './correlation';
export type {
  AlignedSeries,
  CorrelogramOptions,
  DateValue,
  LagResult,
} from './correlation';
export {
  deriveIcons,
  deriveVariationIcon,
  deriveAssuranceIcon,
} from './icons';
export type { IconSummary, VariationIcon, AssuranceIcon } from './icons';
export { describePlottedRows } from './descriptive';
export type { DescriptiveStat, DescriptiveStats } from './descriptive';

export interface AnalyseOptions {
  kind?: AnalysisKind;
}

export interface AnalyseResult {
  analysis: SpcAnalysis;
  /**
   * Rows in the same shape as the input, but with the value field set
   * to whatever should be plotted on the y-axis. For XmR/RunChart this
   * equals the input value. For P charts it's the proportion
   * numerator/denominator. Callers should use this for plotting and
   * for icon derivation so everything stays in a consistent value space.
   */
  plottedRows: SpcRow[];
}

// Top-level: take a series of rows, return everything a chart needs to plot
// and annotate. Pure function; safe to call inside render or a worker.
export function analyseSpc(
  rows: readonly SpcRow[],
  options: AnalyseOptions = {},
): AnalyseResult {
  const kind: AnalysisKind = options.kind ?? 'XmR';
  if (kind === 'P') {
    const { analysis, proportionRows } = analyseProportion(rows);
    return { analysis, plottedRows: proportionRows };
  }
  if (kind === 'C') return analyseCount(rows);
  if (kind === 'U') return analyseRate(rows);
  const { segments, pointLimits } = computeSegments(rows, kind);
  const rules = detectRules(rows, pointLimits, kind);
  return {
    analysis: { kind, segments, pointLimits, rules },
    plottedRows: [...rows],
  };
}
