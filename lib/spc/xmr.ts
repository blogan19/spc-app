// XmR (individuals + moving range) chart maths.
//
// The centre line is the arithmetic mean of the values in the segment.
// Sigma is estimated from the average moving range, NOT from the sample
// standard deviation — see MDC "Strengthening your decisions" p.22:
// "You should use three sigma to calculate limits rather than three standard
//  deviations." Using stdev produces wider limits and misses real signals.

import type { SpcSegment } from './types';

// Wheeler/Shewhart bias-correction constant for moving ranges of size 2.
// sigma_hat = mean(moving range) / d2(n=2).
const D2_N2 = 1.128;

// 3 / d2 — convenience factor: UCL = mean + 2.66·mR-bar, LCL = mean − 2.66·mR-bar.
const THREE_SIGMA_FACTOR = 3 / D2_N2;

export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return mid % 1 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)];
}

// Moving range: |x_i − x_{i-1}| for i in 1..n-1. Length is values.length − 1.
export function movingRanges(values: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    out.push(Math.abs(values[i] - values[i - 1]));
  }
  return out;
}

// XmR limits for a single segment. Returns the segment metadata (limits and
// centre) — the caller decides which row indices it applies to.
export function xmrLimits(
  values: readonly number[],
  startIndex: number,
  endIndex: number,
): SpcSegment {
  const centre = mean(values);
  const med = median(values);
  const mRs = movingRanges(values);
  const mRBar = mRs.length === 0 ? 0 : mean(mRs);
  const sigma = mRBar / D2_N2;
  const halfWidth = THREE_SIGMA_FACTOR * mRBar;
  return {
    startIndex,
    endIndex,
    mean: centre,
    median: med,
    meanMovingRange: mRBar,
    sigma,
    ucl: centre + halfWidth,
    lcl: centre - halfWidth,
  };
}

/**
 * Run-chart segment: median as centre, no control limits. The SpcSegment
 * type's mean/ucl/lcl fields are reused — for a run chart the mean field
 * holds the median and the limits collapse onto it. Consumers check the
 * analysis kind to decide whether to draw limit lines.
 */
export function runChartCentre(
  values: readonly number[],
  startIndex: number,
  endIndex: number,
): SpcSegment {
  const centre = median(values);
  return {
    startIndex,
    endIndex,
    mean: centre,
    median: centre,
    meanMovingRange: 0,
    sigma: 0,
    ucl: centre,
    lcl: centre,
  };
}
