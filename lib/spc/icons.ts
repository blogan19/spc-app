// Variation and assurance icon derivation — the visual summary that
// replaces RAG, defined in MDC: Strengthening Your Decisions, p.26–28.
//
// Variation icon: what is the chart telling us about how the system is
// behaving over time?
// Assurance icon: is the system capable of consistently meeting its target?
//
// Both are pure functions of the analysis output plus aim + target.

import type { SpcAnalysis, SpcRow } from './types';

export type VariationIcon = 'concerning' | 'improvement' | 'common-cause';
export type AssuranceIcon = 'pass' | 'fail' | 'hit-miss';

export interface IconSummary {
  variation: VariationIcon;
  assurance: AssuranceIcon | null; // null when no target is set
}

export function deriveVariationIcon(
  rows: readonly SpcRow[],
  analysis: SpcAnalysis,
  aim: 'increase' | 'decrease',
): VariationIcon {
  type Signal = { index: number; direction: 'improvement' | 'concerning' };
  const signals: Signal[] = [];
  const r = analysis.rules;

  const favourable = (above: boolean) =>
    (above && aim === 'increase') || (!above && aim === 'decrease');

  // Direction runs are pre-labelled by direction. Use the run's last
  // index — it's the most recent point in the trend.
  if (r.increasingRun.length > 0) {
    const last = r.increasingRun[r.increasingRun.length - 1];
    signals.push({ index: last, direction: aim === 'increase' ? 'improvement' : 'concerning' });
  }
  if (r.decreasingRun.length > 0) {
    const last = r.decreasingRun[r.decreasingRun.length - 1];
    signals.push({ index: last, direction: aim === 'decrease' ? 'improvement' : 'concerning' });
  }

  for (const i of r.outsideLimits) {
    const above = rows[i].value > analysis.pointLimits[i].ucl;
    signals.push({ index: i, direction: favourable(above) ? 'improvement' : 'concerning' });
  }
  for (const i of r.runAboveBelowMean) {
    const above = rows[i].value > analysis.pointLimits[i].mean;
    signals.push({ index: i, direction: favourable(above) ? 'improvement' : 'concerning' });
  }
  for (const i of r.twoOfThreeOuterThird) {
    const above = rows[i].value > analysis.pointLimits[i].mean;
    signals.push({ index: i, direction: favourable(above) ? 'improvement' : 'concerning' });
  }

  if (signals.length === 0) return 'common-cause';

  // Latest signal wins. The icon's job is to point the reader at what to
  // act on now — earlier signals may have already been responded to. If
  // two rules fire at the same index, concerning takes the tie since it's
  // the actionable one.
  signals.sort((a, b) => {
    if (a.index !== b.index) return b.index - a.index;
    if (a.direction === b.direction) return 0;
    return a.direction === 'concerning' ? -1 : 1;
  });
  return signals[0].direction;
}

export function deriveAssuranceIcon(
  analysis: SpcAnalysis,
  aim: 'increase' | 'decrease',
  target: number | undefined,
): AssuranceIcon | null {
  if (target === undefined || target === null) return null;
  if (analysis.segments.length === 0) return null;
  // Run charts have no control limits, so "consistently meets/misses"
  // isn't a meaningful judgment to make.
  if (analysis.kind === 'RunChart') return null;

  // The assurance icon describes what to expect going forward, so use
  // the latest segment's limits.
  const latest = analysis.segments[analysis.segments.length - 1];
  const { ucl, lcl } = latest;

  if (aim === 'increase') {
    if (target <= lcl) return 'pass'; // every expected point exceeds the target
    if (target >= ucl) return 'fail'; // no expected point reaches it
    return 'hit-miss';
  }
  // aim === 'decrease'
  if (target >= ucl) return 'pass';
  if (target <= lcl) return 'fail';
  return 'hit-miss';
}

export function deriveIcons(
  rows: readonly SpcRow[],
  analysis: SpcAnalysis,
  aim: 'increase' | 'decrease',
  target?: number,
): IconSummary {
  return {
    variation: deriveVariationIcon(rows, analysis, aim),
    assurance: deriveAssuranceIcon(analysis, aim, target),
  };
}
