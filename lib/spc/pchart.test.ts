import { describe, expect, it } from 'vitest';
import { analyseSpc } from './index';
import type { SpcRow } from './types';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const series = (
  data: Array<[num: number, denom: number]>,
  opts?: { recalcAt?: number[] },
): SpcRow[] =>
  data.map(([num, denom], i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    value: num,
    denominator: denom,
    recalculate: opts?.recalcAt?.includes(i) ?? false,
  }));

describe('P chart — analyseSpc with kind="P"', () => {
  it('returns a P-kind analysis with per-row proportions in plottedRows', () => {
    const rows = series([
      [10, 100],
      [12, 100],
      [11, 100],
    ]);
    const { analysis, plottedRows } = analyseSpc(rows, { kind: 'P' });
    expect(analysis.kind).toBe('P');
    expect(plottedRows.map((r) => round4(r.value))).toEqual([0.1, 0.12, 0.11]);
  });

  it('centres on the pooled proportion, not the average of per-row proportions', () => {
    // 10/100, 1/10 — same per-row proportion (0.1) but pooled = 11/110 = 0.1.
    // Mostly a sanity check that pooling = Σnum / Σdenom is in use.
    const rows = series([
      [10, 100],
      [1, 10],
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'P' });
    expect(round4(analysis.segments[0].mean)).toBe(0.1);
  });

  it('produces tighter limits for rows with larger denominators', () => {
    const rows = series([
      [5, 50],
      [5, 50],
      [5, 50],
      [5, 50],
      [5, 50],
      [50, 500], // ten times the sample — limits should narrow here
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'P' });
    const smallN = analysis.pointLimits[0];
    const bigN = analysis.pointLimits[5];
    const smallSpread = smallN.ucl - smallN.lcl;
    const bigSpread = bigN.ucl - bigN.lcl;
    expect(bigSpread).toBeLessThan(smallSpread);
  });

  it('clamps limits to [0, 1] so we never plot impossible proportions', () => {
    // Tiny sample size with extreme proportion — p̄ ± 3σ will go above 1.
    const rows = series([
      [5, 10],
      [5, 10],
      [5, 10],
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'P' });
    for (const lim of analysis.pointLimits) {
      expect(lim.ucl).toBeLessThanOrEqual(1);
      expect(lim.lcl).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses XmR-style rules — outsideLimits fires when a proportion exceeds its UCL', () => {
    // Stable around 5/100, then a single 30/100 — clearly above UCL.
    const rows = series([
      [5, 100],
      [4, 100],
      [6, 100],
      [5, 100],
      [4, 100],
      [5, 100],
      [6, 100],
      [5, 100],
      [4, 100],
      [30, 100], // p_i = 0.30, far above ~0.05 + 3σ
    ]);
    const { analysis } = analyseSpc(rows, { kind: 'P' });
    expect(analysis.rules.outsideLimits).toContain(9);
  });

  it('respects recalc flags — limits restart at the new segment', () => {
    const rows = series(
      [
        [5, 100],
        [5, 100],
        [5, 100],
        [40, 100],
        [40, 100],
        [40, 100],
      ],
      { recalcAt: [3] },
    );
    const { analysis } = analyseSpc(rows, { kind: 'P' });
    expect(analysis.segments).toHaveLength(2);
    expect(round4(analysis.segments[0].mean)).toBe(0.05);
    expect(round4(analysis.segments[1].mean)).toBe(0.4);
  });

  it('handles rows with zero or missing denominator without crashing', () => {
    const rows: SpcRow[] = [
      { date: '2025-01-01', value: 0, denominator: 0 },
      { date: '2025-01-02', value: 5, denominator: 100 },
      { date: '2025-01-03', value: 6, denominator: 100 },
    ];
    const { analysis, plottedRows } = analyseSpc(rows, { kind: 'P' });
    expect(plottedRows[0].value).toBe(0);
    // Limits for the zero-denominator row should be the segment centre,
    // since sigma_i = sqrt(p̄(1−p̄)/0) is undefined and we clamp to centre.
    expect(analysis.pointLimits[0].ucl).toBe(analysis.pointLimits[0].mean);
  });
});
