import { describe, expect, it } from 'vitest';
import { mean, movingRanges, xmrLimits } from './xmr';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

describe('mean', () => {
  it('returns NaN for empty input', () => {
    expect(Number.isNaN(mean([]))).toBe(true);
  });

  it('matches the arithmetic mean to 4dp', () => {
    expect(round4(mean([10, 12, 11, 14, 13]))).toBe(12);
    expect(round4(mean([1, 2, 3]))).toBe(2);
  });
});

describe('movingRanges', () => {
  it('returns empty for a single point', () => {
    expect(movingRanges([42])).toEqual([]);
  });

  it('returns absolute consecutive differences', () => {
    expect(movingRanges([10, 12, 11, 14, 13])).toEqual([2, 1, 3, 1]);
  });

  it('handles negative differences as absolute values', () => {
    expect(movingRanges([5, 1, 8])).toEqual([4, 7]);
  });
});

describe('xmrLimits', () => {
  // Worked example by hand:
  //   values:  [10, 12, 11, 14, 13]
  //   mean   = 12
  //   mR     = [2, 1, 3, 1]
  //   mR-bar = 1.75
  //   sigma  = 1.75 / 1.128            = 1.55141843...
  //   3·sigma= (3 / 1.128) · 1.75      = 4.65425531...
  //   UCL    = 12 + 4.6543             = 16.6543
  //   LCL    = 12 − 4.6543             =  7.3457
  it('matches a hand-calculated XmR example to 4dp', () => {
    const seg = xmrLimits([10, 12, 11, 14, 13], 0, 4);
    expect(seg.mean).toBe(12);
    expect(round4(seg.meanMovingRange)).toBe(1.75);
    expect(round4(seg.sigma)).toBe(1.5514);
    expect(round4(seg.ucl)).toBe(16.6543);
    expect(round4(seg.lcl)).toBe(7.3457);
  });

  it('produces zero-width limits for perfectly flat data', () => {
    const seg = xmrLimits([10, 10, 10, 10], 0, 3);
    expect(seg.mean).toBe(10);
    expect(seg.meanMovingRange).toBe(0);
    expect(seg.sigma).toBe(0);
    expect(seg.ucl).toBe(10);
    expect(seg.lcl).toBe(10);
  });

  it('does not use sample standard deviation (regression for P0.1)', () => {
    // Spike data: stdev-based limits would be much wider than XmR limits.
    // For [10,10,10,10,10,10,10,10,10,30]:
    //   mR-bar = (0·8 + 20)/9 = 2.222...
    //   3·sigma half-width = (3 / 1.128) · 2.222... = 5.9102...
    // A stdev-based "3·s" half-width would be ~18 (s ≈ 6), so confusing the
    // two would push the spike inside the limits. XmR keeps it outside.
    const seg = xmrLimits([10, 10, 10, 10, 10, 10, 10, 10, 10, 30], 0, 9);
    expect(round4(seg.meanMovingRange)).toBe(2.2222);
    expect(round4(seg.ucl - seg.mean)).toBe(5.9102);
    expect(seg.ucl).toBeLessThan(30); // the spike must be outside the limit
  });

  it('records the start and end indices it was given', () => {
    const seg = xmrLimits([1, 2, 3], 5, 7);
    expect(seg.startIndex).toBe(5);
    expect(seg.endIndex).toBe(7);
  });
});
