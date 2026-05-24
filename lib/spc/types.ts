// Shared SPC types. The maths library is pure: no React, no DOM, no I/O.

export interface SpcRow {
  date: string; // ISO yyyy-mm-dd
  /**
   * Plotted value.
   *  - XmR / RunChart: the metric itself.
   *  - P chart: the numerator (count of events). The library divides by
   *    the denominator and replaces this with the proportion in its
   *    output rows, so downstream rule detection still sees the right
   *    "value" relative to the proportion-space limits.
   */
  value: number;
  /** Sample size for the row — required for P/C/U charts, ignored for XmR/Run. */
  denominator?: number;
  recalculate?: boolean; // true marks the FIRST point of a new phase (segment)
}

export interface SpcSegment {
  startIndex: number; // inclusive
  endIndex: number; // inclusive
  /**
   * The centre used by this analysis kind for limits and rules:
   *  - XmR / P / C / U: arithmetic mean (or pooled proportion / rate).
   *  - RunChart: the median.
   * Kept under `mean` for backwards compatibility with existing tests
   * and consumers — see also `median` below for the explicit median.
   */
  mean: number;
  /** Arithmetic median of the segment values. Always populated. */
  median: number;
  meanMovingRange: number;
  sigma: number; // mean moving range / d2(n=2) = mR-bar / 1.128
  ucl: number; // mean + 3·sigma
  lcl: number; // mean − 3·sigma
}

// Per-row view of the limits that apply to it. Convenient for plotting
// without re-finding the owning segment.
export interface SpcPointLimits {
  mean: number;
  /** Arithmetic median of the row's segment. */
  median: number;
  ucl: number;
  lcl: number;
}

export interface RuleHits {
  // Rule 1: point outside the process limits
  outsideLimits: number[];
  // Rule 2: 7+ consecutive points on the same side of the mean
  runAboveBelowMean: number[];
  // Rule 3: 6+ consecutive points strictly increasing
  increasingRun: number[];
  // Rule 3: 6+ consecutive points strictly decreasing
  decreasingRun: number[];
  // Rule 4: 2 of 3 consecutive points in the outer third of the limits
  twoOfThreeOuterThird: number[];
}

// XmR uses arithmetic mean as the centre; Run charts use the median and
// have no control limits; P charts use the pooled proportion as centre
// with per-point binomial limits; C charts use the mean count with
// constant Poisson limits; U charts use the pooled rate with per-point
// Poisson limits that vary by exposure.
export type AnalysisKind = 'XmR' | 'RunChart' | 'P' | 'C' | 'U';

export interface SpcAnalysis {
  kind: AnalysisKind;
  segments: SpcSegment[];
  pointLimits: SpcPointLimits[]; // length === rows.length
  rules: RuleHits;
}
