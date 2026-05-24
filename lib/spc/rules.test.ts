import { describe, expect, it } from 'vitest';
import { detectRules } from './rules';
import { computeSegments } from './segments';
import { analyseSpc } from './index';
import type { SpcRow } from './types';

const series = (values: number[], opts?: { recalcAt?: number[] }): SpcRow[] =>
  values.map((value, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value,
    recalculate: opts?.recalcAt?.includes(i) ?? false,
  }));

describe('Rule 1 — point outside limits', () => {
  it('flags any point above UCL or below LCL', () => {
    // Stable noise plus one big spike. The spike falls outside the XmR limits.
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 50]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.outsideLimits).toContain(9);
    expect(rules.outsideLimits).not.toContain(8);
  });

  it('does not flag anything when all points lie within limits', () => {
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 11]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.outsideLimits).toEqual([]);
  });
});

describe('Rule 2 — 7+ consecutive points on the same side of the mean', () => {
  it('flags a run of 8 below-mean points', () => {
    // 8 fives followed by 6 fifteens: mean = (8·5 + 6·15) / 14 = 9.2857.
    // Positions 0..7 are all below mean (run of 8) → triggers.
    // Positions 8..13 are above mean but only 6 of them → does not trigger.
    const rows = series([5, 5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.runAboveBelowMean).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('does not flag a run of exactly 6 on one side', () => {
    // 6 below, then 8 above. Below run is too short; above run is long enough.
    const rows = series([5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.runAboveBelowMean).not.toContain(0);
    expect(rules.runAboveBelowMean).toContain(13);
  });

  it('resets at segment boundaries (regression for P0.2 — uses mean per segment)', () => {
    // Five points below 100, then four points below 200. Without the
    // segment reset they'd all count as "below the global mean" — with
    // the reset, neither run on its own is long enough to trigger.
    const rows = series([90, 91, 90, 92, 91, 195, 194, 196, 193], { recalcAt: [5] });
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.runAboveBelowMean).toEqual([]);
  });
});

describe('Rule 3 — 6+ consecutive points moving the same direction', () => {
  it('flags 7 consecutively increasing points in the increasingRun bucket', () => {
    const rows = series([1, 2, 3, 4, 5, 6, 7]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.increasingRun).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rules.decreasingRun).toEqual([]);
  });

  it('flags 6 consecutively decreasing points in the decreasingRun bucket', () => {
    const rows = series([100, 90, 80, 70, 60, 50]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.decreasingRun).toEqual([0, 1, 2, 3, 4, 5]);
    expect(rules.increasingRun).toEqual([]);
  });

  it('does not flag a 5-point trend', () => {
    const rows = series([1, 2, 3, 4, 5]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.increasingRun).toEqual([]);
    expect(rules.decreasingRun).toEqual([]);
  });

  it('breaks a run on an equal consecutive value', () => {
    const rows = series([1, 2, 3, 3, 4, 5, 6]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.increasingRun).toEqual([]);
    expect(rules.decreasingRun).toEqual([]);
  });

  it('catches a run that ends partway through the series', () => {
    // 6 increasing, then a drop. The drop should not blank the flagged run.
    const rows = series([1, 2, 3, 4, 5, 6, 7, 2]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.increasingRun).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('Rule 4 — 2 of 3 in the outer third on the same side', () => {
  it('flags two near-UCL points sandwiching a normal point', () => {
    // Flat 10s with two 17 spikes at positions 7 and 9.
    //   mean = 11.4, mR-bar = 21/9 = 2.333, sigma ≈ 2.07
    //   outer-third upper boundary = mean + 2·sigma ≈ 15.54
    //   UCL = mean + 3·sigma ≈ 17.60
    // Both 17s sit between 15.54 and 17.60 → outer third (Wheeler zone A).
    // Window [7,8,9] = [17,10,17] contains 2 upper-zone points.
    const rows = series([10, 10, 10, 10, 10, 10, 10, 17, 10, 17]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.twoOfThreeOuterThird).toEqual(expect.arrayContaining([7, 9]));
  });

  it('does not fire when only one point per window is in the outer third', () => {
    // Same shape but a single spike: no 3-window contains 2 outer-third points.
    const rows = series([10, 10, 10, 10, 10, 10, 10, 17, 10, 10]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.twoOfThreeOuterThird).toEqual([]);
  });

  it('does not fire on degenerate flat data (sigma = 0)', () => {
    const rows = series([10, 10, 10, 10]);
    const { rules } = analyseSpc(rows).analysis;
    expect(rules.twoOfThreeOuterThird).toEqual([]);
  });
});

describe('analyseSpc — integration', () => {
  it('returns segments, point limits and rule hits in one call', () => {
    const rows = series([1, 2, 3, 4, 5, 6, 7]);
    const result = analyseSpc(rows).analysis;
    expect(result.kind).toBe('XmR');
    expect(result.segments).toHaveLength(1);
    expect(result.pointLimits).toHaveLength(7);
    expect(result.rules.increasingRun).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('Run chart mode', () => {
  it('uses the median as centre and collapses the limits onto it', () => {
    const rows = series([10, 12, 11, 14, 13]); // median = 12
    const result = analyseSpc(rows, { kind: 'RunChart' }).analysis;
    expect(result.kind).toBe('RunChart');
    expect(result.segments[0].mean).toBe(12);
    expect(result.segments[0].ucl).toBe(12);
    expect(result.segments[0].lcl).toBe(12);
  });

  it('suppresses the limit-dependent rules', () => {
    // A single big spike would fire outsideLimits in XmR mode.
    const rows = series([10, 11, 9, 10, 12, 9, 11, 10, 12, 50]);
    const result = analyseSpc(rows, { kind: 'RunChart' }).analysis;
    expect(result.rules.outsideLimits).toEqual([]);
    expect(result.rules.twoOfThreeOuterThird).toEqual([]);
  });

  it('still fires the median-side and direction rules', () => {
    // 7 high values followed by 7 low values. Median = 12.5 (between the
    // two modes), so every point sits cleanly on one side and both runs
    // trip the 7+ threshold.
    const rows = series([20, 20, 20, 20, 20, 20, 20, 5, 5, 5, 5, 5, 5, 5]);
    const result = analyseSpc(rows, { kind: 'RunChart' }).analysis;
    expect(result.rules.runAboveBelowMean).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('recomputes the median per recalculation segment', () => {
    const rows = series([10, 11, 10, 11, 10, 50, 51, 50, 51]);
    rows[5].recalculate = true;
    const result = analyseSpc(rows, { kind: 'RunChart' }).analysis;
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].mean).toBe(10); // median of first 5
    expect(result.segments[1].mean).toBe(50.5); // median of last 4
  });
});

describe('detectRules', () => {
  it('is callable directly with externally supplied limits', () => {
    const rows = series([1, 2, 3, 4, 5, 6, 7]);
    const { pointLimits } = computeSegments(rows);
    const hits = detectRules(rows, pointLimits);
    expect(hits.increasingRun).toHaveLength(7);
    expect(hits.decreasingRun).toEqual([]);
  });
});
