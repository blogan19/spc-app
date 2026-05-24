import { describe, expect, it } from 'vitest';
import { analyseFunnel } from './funnel';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

describe('analyseFunnel', () => {
  it('pools the rate across all units', () => {
    // 5/100 and 15/100 — pooled is 20/200 = 0.10, same as the average
    // because denominators are equal.
    const r = analyseFunnel([
      { name: 'A', numerator: 5, denominator: 100 },
      { name: 'B', numerator: 15, denominator: 100 },
    ]);
    expect(round4(r.pooledRate)).toBe(0.1);
  });

  it('weights by denominator (not by per-unit rate)', () => {
    // Per-row rates: 0.10 and 0.50. If we (incorrectly) averaged them we'd
    // get 0.30. Pooled = (10 + 5) / (100 + 10) = 15/110 ≈ 0.1364.
    const r = analyseFunnel([
      { name: 'A', numerator: 10, denominator: 100 },
      { name: 'B', numerator: 5, denominator: 10 },
    ]);
    expect(round4(r.pooledRate)).toBe(0.1364);
  });

  it('flags units that fall above UCL as high signals', () => {
    // Many similar units around 5% with one ward at 25%.
    const r = analyseFunnel([
      { name: 'W1', numerator: 5, denominator: 100 },
      { name: 'W2', numerator: 6, denominator: 100 },
      { name: 'W3', numerator: 4, denominator: 100 },
      { name: 'W4', numerator: 5, denominator: 100 },
      { name: 'W5', numerator: 6, denominator: 100 },
      { name: 'Outlier', numerator: 25, denominator: 100 },
    ]);
    const out = r.units.find((u) => u.name === 'Outlier');
    expect(out?.signal).toBe('high');
  });

  it('flags units below LCL as low signals', () => {
    const r = analyseFunnel([
      { name: 'A', numerator: 25, denominator: 100 },
      { name: 'B', numerator: 26, denominator: 100 },
      { name: 'C', numerator: 24, denominator: 100 },
      { name: 'D', numerator: 27, denominator: 100 },
      { name: 'E', numerator: 25, denominator: 100 },
      { name: 'Low', numerator: 2, denominator: 100 },
    ]);
    const low = r.units.find((u) => u.name === 'Low');
    expect(low?.signal).toBe('low');
  });

  it('does not flag units inside the funnel', () => {
    const r = analyseFunnel([
      { name: 'A', numerator: 5, denominator: 100 },
      { name: 'B', numerator: 6, denominator: 100 },
      { name: 'C', numerator: 4, denominator: 100 },
      { name: 'D', numerator: 5, denominator: 100 },
    ]);
    expect(r.units.every((u) => u.signal === null)).toBe(true);
  });

  it('produces wider limits at smaller denominators', () => {
    const r = analyseFunnel([
      { name: 'small', numerator: 5, denominator: 50 },
      { name: 'large', numerator: 500, denominator: 5000 },
    ]);
    const small = r.units.find((u) => u.name === 'small')!;
    const large = r.units.find((u) => u.name === 'large')!;
    expect(small.ucl - small.lcl).toBeGreaterThan(large.ucl - large.lcl);
  });

  it('clamps the funnel to [0, 1]', () => {
    // Small denominators near a moderate rate ⇒ raw UCL might exceed 1.
    const r = analyseFunnel([
      { name: 'A', numerator: 4, denominator: 10 },
      { name: 'B', numerator: 5, denominator: 10 },
      { name: 'C', numerator: 3, denominator: 10 },
    ]);
    for (const u of r.units) {
      expect(u.ucl).toBeLessThanOrEqual(1);
      expect(u.lcl).toBeGreaterThanOrEqual(0);
    }
    for (const c of r.curve) {
      expect(c.ucl).toBeLessThanOrEqual(1);
      expect(c.lcl).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns a smooth curve sampled across the denominator range', () => {
    const r = analyseFunnel(
      [
        { name: 'A', numerator: 5, denominator: 100 },
        { name: 'B', numerator: 50, denominator: 1000 },
        { name: 'C', numerator: 500, denominator: 10000 },
      ],
      { samples: 20 },
    );
    expect(r.curve).toHaveLength(21);
    expect(r.denominatorRange).toEqual({ min: 100, max: 10000 });
    // The curve UCL at smaller n is wider than at bigger n.
    expect(r.curve[0].ucl).toBeGreaterThan(r.curve[r.curve.length - 1].ucl);
  });

  it('filters out invalid input rows', () => {
    const r = analyseFunnel([
      { name: 'A', numerator: 5, denominator: 100 },
      { name: '', numerator: 5, denominator: 100 },
      { name: 'B', numerator: 5, denominator: 0 },
      { name: 'C', numerator: -3, denominator: 100 },
    ]);
    expect(r.units.map((u) => u.name)).toEqual(['A']);
  });

  it('handles an empty input gracefully', () => {
    const r = analyseFunnel([]);
    expect(r.units).toEqual([]);
    expect(r.pooledRate).toBe(0);
    expect(r.curve.length).toBeGreaterThan(0); // still produces sample points (degenerate)
  });
});
