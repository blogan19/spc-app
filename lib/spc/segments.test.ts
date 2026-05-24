import { describe, expect, it } from 'vitest';
import { computeSegments } from './segments';
import type { SpcRow } from './types';

const row = (date: string, value: number, recalculate?: boolean): SpcRow => ({
  date,
  value,
  recalculate,
});

describe('computeSegments', () => {
  it('returns empty results for empty input', () => {
    expect(computeSegments([])).toEqual({ segments: [], pointLimits: [] });
  });

  it('produces a single segment spanning all rows when no recalc flags are set', () => {
    const rows = [
      row('2025-01-01', 10),
      row('2025-01-02', 12),
      row('2025-01-03', 11),
      row('2025-01-04', 14),
      row('2025-01-05', 13),
    ];
    const result = computeSegments(rows);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].startIndex).toBe(0);
    expect(result.segments[0].endIndex).toBe(4);
    expect(result.pointLimits).toHaveLength(5);
    expect(result.pointLimits[0]).toEqual(result.pointLimits[4]);
  });

  it('splits at recalc flags and recomputes limits per segment', () => {
    const rows = [
      row('2025-01-01', 10),
      row('2025-01-02', 11),
      row('2025-01-03', 10),
      row('2025-01-04', 50, true), // start of segment 2
      row('2025-01-05', 52),
      row('2025-01-06', 51),
    ];
    const result = computeSegments(rows);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({ startIndex: 0, endIndex: 2 });
    expect(result.segments[1]).toMatchObject({ startIndex: 3, endIndex: 5 });
    expect(result.segments[0].mean).toBeCloseTo(10.333, 3);
    expect(result.segments[1].mean).toBeCloseTo(51, 3);
    // Per-row projection reflects the segment each row belongs to.
    expect(result.pointLimits[2].mean).toBeCloseTo(10.333, 3);
    expect(result.pointLimits[3].mean).toBeCloseTo(51, 3);
  });

  it('ignores a recalc flag on the very first row (it would be a no-op anyway)', () => {
    const rows = [row('2025-01-01', 10, true), row('2025-01-02', 12)];
    const result = computeSegments(rows);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].startIndex).toBe(0);
  });

  it('supports three segments from two recalc flags', () => {
    const rows = [
      row('2025-01-01', 10),
      row('2025-01-02', 11),
      row('2025-01-03', 30, true),
      row('2025-01-04', 31),
      row('2025-01-05', 60, true),
      row('2025-01-06', 62),
    ];
    const result = computeSegments(rows);
    expect(result.segments).toHaveLength(3);
    expect(result.segments.map((s) => [s.startIndex, s.endIndex])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
});
