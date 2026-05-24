import { describe, expect, it } from 'vitest';
import {
  alignByDate,
  laggedCorrelation,
  meanOf,
  pearson,
  peakLag,
} from './correlation';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

describe('pearson', () => {
  it('returns 1 for identical series', () => {
    expect(pearson([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1, 6);
  });

  it('returns -1 for perfectly negatively correlated series', () => {
    expect(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });

  it('returns 0 for series with no linear relationship', () => {
    // Symmetric around the mean — Pearson r is 0.
    expect(round3(pearson([1, 2, 3, 4, 5], [3, 1, 3, 1, 3]))).toBe(0);
  });

  it('returns NaN when a series has zero variance', () => {
    expect(Number.isNaN(pearson([5, 5, 5, 5], [1, 2, 3, 4]))).toBe(true);
  });

  it('returns NaN for mismatched lengths', () => {
    expect(Number.isNaN(pearson([1, 2, 3], [1, 2]))).toBe(true);
  });
});

describe('alignByDate', () => {
  it('returns the intersection of dates, sorted ascending', () => {
    const a = [
      { date: '2024-01-03', value: 3 },
      { date: '2024-01-01', value: 1 },
      { date: '2024-01-02', value: 2 },
    ];
    const b = [
      { date: '2024-01-02', value: 20 },
      { date: '2024-01-04', value: 40 },
      { date: '2024-01-01', value: 10 },
    ];
    const aligned = alignByDate(a, b);
    expect(aligned.dates).toEqual(['2024-01-01', '2024-01-02']);
    expect(aligned.x).toEqual([1, 2]);
    expect(aligned.y).toEqual([10, 20]);
  });

  it('uses the last value when a date repeats in the input', () => {
    const aligned = alignByDate(
      [
        { date: '2024-01-01', value: 1 },
        { date: '2024-01-01', value: 99 },
      ],
      [{ date: '2024-01-01', value: 10 }],
    );
    expect(aligned.x).toEqual([99]);
  });

  it('returns empty arrays when there is no overlap', () => {
    const aligned = alignByDate(
      [{ date: '2024-01-01', value: 1 }],
      [{ date: '2024-02-01', value: 2 }],
    );
    expect(aligned.dates).toEqual([]);
    expect(aligned.x).toEqual([]);
    expect(aligned.y).toEqual([]);
  });
});

describe('laggedCorrelation', () => {
  it('peaks at lag 0 when the series are identical (and non-monotonic)', () => {
    // Monotonic series correlate perfectly at every lag — useless for
    // testing the peak. A scrambled-but-equal pair gives a clear peak.
    const x = [1, 5, 2, 8, 3, 9, 4, 7, 6, 0, 11, 4];
    const lags = laggedCorrelation(x, x, { maxLag: 4 });
    const peak = peakLag(lags);
    expect(peak?.lag).toBe(0);
    expect(round3(peak?.r ?? 0)).toBe(1);
  });

  it('peaks at lag +k when x leads y by k periods', () => {
    // y[t] = x[t-3] — x leads y by 3. Convention here: ccf(x,y)_k
    // correlates x_t with y_{t+k}, so the peak sits at lag = +3.
    const x = [1, 5, 2, 8, 3, 9, 4, 7, 6, 0, 11, 4];
    const y = [0, 0, 0, 1, 5, 2, 8, 3, 9, 4, 7, 6];
    const lags = laggedCorrelation(x, y, { maxLag: 5 });
    const peak = peakLag(lags);
    expect(peak?.lag).toBe(3);
    expect(Math.abs(peak?.r ?? 0)).toBeCloseTo(1, 6);
  });

  it('flags significant lags using the 2/√n threshold', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const lags = laggedCorrelation(x, x, { maxLag: 2 });
    const zero = lags.find((l) => l.lag === 0)!;
    expect(zero.significant).toBe(true);
    expect(zero.r).toBeCloseTo(1, 6);
  });

  it('respects maxLag and the floor(len/2) cap', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8]; // len 8 ⇒ cap 4
    const lags = laggedCorrelation(x, x, { maxLag: 10 });
    expect(lags[0].lag).toBe(-4);
    expect(lags[lags.length - 1].lag).toBe(4);
  });

  it('returns an empty array when there are fewer than 3 points', () => {
    expect(laggedCorrelation([1, 2], [1, 2])).toEqual([]);
  });
});

describe('peakLag', () => {
  it('ignores NaN entries', () => {
    const peak = peakLag([
      { lag: -1, r: NaN, n: 0, significant: false },
      { lag: 0, r: 0.5, n: 10, significant: true },
      { lag: 1, r: -0.7, n: 9, significant: true },
    ]);
    expect(peak?.lag).toBe(1);
  });

  it('returns null when nothing is finite', () => {
    expect(
      peakLag([{ lag: 0, r: NaN, n: 0, significant: false }]),
    ).toBeNull();
  });
});
