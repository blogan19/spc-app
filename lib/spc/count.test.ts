import { describe, expect, it } from 'vitest';
import { analyseSpc } from './index';
import type { SpcRow } from './types';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const counts = (values: number[], opts?: { recalcAt?: number[] }): SpcRow[] =>
  values.map((value, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value,
    recalculate: opts?.recalcAt?.includes(i) ?? false,
  }));

const rates = (
  data: Array<[num: number, exp: number]>,
  opts?: { recalcAt?: number[] },
): SpcRow[] =>
  data.map(([num, exp], i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value: num,
    denominator: exp,
    recalculate: opts?.recalcAt?.includes(i) ?? false,
  }));

describe('C chart — analyseSpc with kind="C"', () => {
  // Hand-calculated:
  //   counts: [2, 3, 4, 2, 3, 5, 1, 4, 2, 3, 4, 3]
  //   c̄    = 36/12 = 3
  //   sigma = √3 ≈ 1.7321
  //   UCL   = 3 + 3·1.7321 = 8.1962
  //   LCL   = max(0, 3 − 3·1.7321) = 0
  it('matches a hand-calculated C chart to 4dp', () => {
    const rows = counts([2, 3, 4, 2, 3, 5, 1, 4, 2, 3, 4, 3]);
    const { analysis } = analyseSpc(rows, { kind: 'C' });
    expect(analysis.kind).toBe('C');
    expect(round4(analysis.segments[0].mean)).toBe(3);
    expect(round4(analysis.segments[0].sigma)).toBe(1.7321);
    expect(round4(analysis.segments[0].ucl)).toBe(8.1962);
    expect(analysis.segments[0].lcl).toBe(0);
  });

  it('applies constant limits across all rows within a segment', () => {
    const rows = counts([2, 3, 4, 2, 3, 5, 1, 4, 2, 3, 4, 3]);
    const { analysis } = analyseSpc(rows, { kind: 'C' });
    const first = analysis.pointLimits[0];
    for (const lim of analysis.pointLimits) {
      expect(lim).toEqual(first);
    }
  });

  it('clamps LCL to zero (counts can never be negative)', () => {
    // Low mean ⇒ c̄ − 3√c̄ would be negative.
    const rows = counts([0, 1, 0, 1, 2, 0, 1, 0]);
    const { analysis } = analyseSpc(rows, { kind: 'C' });
    expect(analysis.segments[0].lcl).toBe(0);
    for (const lim of analysis.pointLimits) {
      expect(lim.lcl).toBe(0);
    }
  });

  it('flags an outlier count outside the limits', () => {
    const rows = counts([2, 3, 4, 2, 3, 5, 1, 4, 2, 3, 4, 25]);
    const { analysis } = analyseSpc(rows, { kind: 'C' });
    expect(analysis.rules.outsideLimits).toContain(11);
  });

  it('recomputes c̄ at each recalculation segment', () => {
    const rows = counts([2, 3, 4, 2, 3, 20, 21, 22, 19, 20], { recalcAt: [5] });
    const { analysis } = analyseSpc(rows, { kind: 'C' });
    expect(analysis.segments).toHaveLength(2);
    expect(round4(analysis.segments[0].mean)).toBe(2.8);
    expect(round4(analysis.segments[1].mean)).toBe(20.4);
  });
});

describe('U chart — analyseSpc with kind="U"', () => {
  it('plots rates (numerator / exposure) in plottedRows', () => {
    const rows = rates([
      [4, 1000],
      [6, 1000],
      [3, 1000],
    ]);
    const { plottedRows } = analyseSpc(rows, { kind: 'U' });
    expect(plottedRows.map((r) => round4(r.value))).toEqual([0.004, 0.006, 0.003]);
  });

  it('uses the pooled rate as centre (not the average of per-row rates)', () => {
    const rows = rates([
      [10, 1000], // rate 0.01
      [1, 100], // rate 0.01 again — pooled rate is also 0.01
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'U' });
    expect(round4(analysis.segments[0].mean)).toBe(0.01);
  });

  it('produces tighter limits at rows with greater exposure', () => {
    const rows = rates([
      [4, 100],
      [4, 100],
      [4, 100],
      [4, 100],
      [400, 10000], // hundred-fold exposure ⇒ much tighter limit
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'U' });
    const small = analysis.pointLimits[0];
    const big = analysis.pointLimits[4];
    expect(big.ucl - big.lcl).toBeLessThan(small.ucl - small.lcl);
  });

  it('clamps LCL to zero so rates never go negative', () => {
    const rows = rates([
      [1, 1000],
      [0, 1000],
      [1, 1000],
      [2, 1000],
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'U' });
    for (const lim of analysis.pointLimits) {
      expect(lim.lcl).toBeGreaterThanOrEqual(0);
    }
  });

  it('fires outside-limits when a rate spike exceeds the per-point UCL', () => {
    // Stable rate ~0.005 (5/1000), then a clear spike of 80/1000 = 0.08.
    const rows = rates([
      [5, 1000],
      [6, 1000],
      [4, 1000],
      [5, 1000],
      [6, 1000],
      [5, 1000],
      [4, 1000],
      [5, 1000],
      [4, 1000],
      [80, 1000],
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'U' });
    expect(analysis.rules.outsideLimits).toContain(9);
  });

  it('handles zero exposure gracefully (collapsed limits, plotted = 0)', () => {
    const rows: SpcRow[] = [
      { date: '2025-01-01', value: 0, denominator: 0 },
      { date: '2025-01-02', value: 4, denominator: 1000 },
      { date: '2025-01-03', value: 5, denominator: 1000 },
    ];
    const { analysis, plottedRows } = analyseSpc(rows, { kind: 'U' });
    expect(plottedRows[0].value).toBe(0);
    expect(analysis.pointLimits[0].ucl).toBe(analysis.pointLimits[0].mean);
  });
});
