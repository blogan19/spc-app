// Variation and assurance icon derivation — the visual summary that
// replaces RAG, defined in MDC: Strengthening Your Decisions, p.26–28.
//
// Variation icon: what is the chart telling us about how the system is
// behaving over time?
// Assurance icon: is the system capable of consistently meeting its target?
//
// Both are pure functions of the analysis output plus aim + target.

import type { SpcAnalysis, SpcRow } from './types';

// 'special-cause' = a signal has fired but the user hasn't picked an aim,
// so we can't editorialise as improvement-vs-concerning. The chart still
// flags variation, just without the editorial spin.
export type VariationIcon =
  | 'concerning'
  | 'improvement'
  | 'common-cause'
  | 'special-cause';
export type AssuranceIcon = 'pass' | 'fail' | 'hit-miss';

export interface IconSummary {
  variation: VariationIcon;
  assurance: AssuranceIcon | null; // null when no target is set or aim is 'none'
}

export type IconAim = 'increase' | 'decrease' | 'none';

export function deriveVariationIcon(
  rows: readonly SpcRow[],
  analysis: SpcAnalysis,
  aim: IconAim,
): VariationIcon {
  const r = analysis.rules;

  if (aim === 'none') {
    // No directional editorialising — just check whether any rule fired.
    const anySignal =
      r.outsideLimits.length > 0 ||
      r.runAboveBelowMean.length > 0 ||
      r.twoOfThreeOuterThird.length > 0 ||
      r.increasingRun.length > 0 ||
      r.decreasingRun.length > 0;
    return anySignal ? 'special-cause' : 'common-cause';
  }

  type Signal = { index: number; direction: 'improvement' | 'concerning' };
  const signals: Signal[] = [];

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
  aim: IconAim,
  target: number | undefined,
): AssuranceIcon | null {
  if (aim === 'none') return null; // "meeting target" implies a direction
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
  aim: IconAim,
  target?: number,
): IconSummary {
  return {
    variation: deriveVariationIcon(rows, analysis, aim),
    assurance: deriveAssuranceIcon(analysis, aim, target),
  };
}

// Plain-English narrative of the variation state, intended for the Quick
// Stats panel under the chart. Leads with the concrete rule reason (e.g.
// "8 consecutive points above the centre line") so the reader can see
// *why* the variation icon is what it is, then ties it back to the
// user's aim where one is set.
export function describeVariation(
  rows: readonly SpcRow[],
  analysis: SpcAnalysis,
  aim: IconAim,
): string {
  if (rows.length === 0) return '';
  const variation = deriveVariationIcon(rows, analysis, aim);
  const r = analysis.rules;

  // Build a list of *specific* reasons, using actual counts and run
  // lengths rather than the generic "7+" / "6+" thresholds.
  const reasons: string[] = [];
  if (r.outsideLimits.length > 0) {
    reasons.push(
      `${r.outsideLimits.length} point${r.outsideLimits.length === 1 ? '' : 's'} outside the control limits`,
    );
  }
  if (r.runAboveBelowMean.length > 0) {
    const n = longestConsecutiveRun(r.runAboveBelowMean);
    reasons.push(`${n} consecutive points on the same side of the centre line`);
  }
  if (r.increasingRun.length > 0) {
    const n = longestConsecutiveRun(r.increasingRun);
    reasons.push(`${n} consecutive rising points`);
  }
  if (r.decreasingRun.length > 0) {
    const n = longestConsecutiveRun(r.decreasingRun);
    reasons.push(`${n} consecutive falling points`);
  }
  if (r.twoOfThreeOuterThird.length > 0) {
    reasons.push('2 of 3 consecutive points in the outer third on the same side');
  }
  const joined = capitaliseFirst(joinList(reasons));
  const aimVerb = aim === 'increase' ? 'increase' : aim === 'decrease' ? 'decrease' : null;

  if (variation === 'common-cause') {
    return 'Common-cause variation: no statistical rule has fired. The ups and downs are within statistical expectation — natural process noise, not a real change. No action is needed beyond ongoing monitoring.';
  }
  if (variation === 'special-cause') {
    return `${joined}. No aim is set, so the direction is not editorialised — investigate the highlighted points to understand what changed.`;
  }
  if (variation === 'improvement') {
    return `${joined}. This is an improvement signal because your aim is to ${aimVerb} this measure and the process has moved in that direction. Investigate what changed so you can lock the gain in.`;
  }
  return `${joined}. This is a concerning signal because your aim is to ${aimVerb} this measure but the process has moved against it. Investigate the highlighted points to understand what changed.`;
}

// Longest stretch of consecutive integers inside a sorted index list.
// rules.ts flags every point that participates in a triggered pattern,
// so a 9-point run shows up as 9 consecutive indices — that's the run
// length we want to surface.
function longestConsecutiveRun(indices: readonly number[]): number {
  if (indices.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1] + 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function capitaliseFirst(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}
