import { describe, expect, it } from 'vitest';
import { analysePareto } from './pareto';

const round2 = (n: number) => Math.round(n * 100) / 100;

describe('analysePareto', () => {
  it('sorts categories in descending order of count', () => {
    const result = analysePareto([
      { name: 'falls', count: 5 },
      { name: 'medication errors', count: 30 },
      { name: 'pressure ulcers', count: 12 },
      { name: 'IT', count: 3 },
    ]);
    expect(result.categories.map((c) => c.name)).toEqual([
      'medication errors',
      'pressure ulcers',
      'falls',
      'IT',
    ]);
  });

  it('computes percentages and a strictly increasing cumulative', () => {
    const result = analysePareto([
      { name: 'a', count: 50 },
      { name: 'b', count: 30 },
      { name: 'c', count: 20 },
    ]);
    expect(result.total).toBe(100);
    expect(result.categories.map((c) => round2(c.percentage))).toEqual([50, 30, 20]);
    expect(result.categories.map((c) => round2(c.cumulativePercentage))).toEqual([
      50, 80, 100,
    ]);
  });

  it('counts the vital few at the 80% threshold by default', () => {
    // Two categories cross 80% (50 + 30 = 80).
    const result = analysePareto([
      { name: 'a', count: 50 },
      { name: 'b', count: 30 },
      { name: 'c', count: 15 },
      { name: 'd', count: 5 },
    ]);
    expect(result.vitalFewThreshold).toBe(80);
    expect(result.vitalFewCount).toBe(2);
  });

  it('honours a custom threshold', () => {
    const result = analysePareto(
      [
        { name: 'a', count: 50 },
        { name: 'b', count: 30 },
        { name: 'c', count: 20 },
      ],
      { threshold: 50 },
    );
    expect(result.vitalFewCount).toBe(1);
  });

  it('returns all categories as vital few when none crosses the threshold', () => {
    // Five equal categories — none reaches 80% by itself or in pairs.
    const result = analysePareto([
      { name: 'a', count: 1 },
      { name: 'b', count: 1 },
      { name: 'c', count: 1 },
      { name: 'd', count: 1 },
      { name: 'e', count: 1 },
    ]);
    expect(result.vitalFewCount).toBe(4); // first index reaching 80% (4th category at 80%)
  });

  it('drops invalid rows (empty name, zero or negative count)', () => {
    const result = analysePareto([
      { name: 'a', count: 10 },
      { name: '', count: 5 },
      { name: 'b', count: 0 },
      { name: 'c', count: 5 },
      { name: 'd', count: -2 },
    ]);
    expect(result.categories.map((c) => c.name)).toEqual(['a', 'c']);
  });

  it('handles an empty input gracefully', () => {
    const result = analysePareto([]);
    expect(result.categories).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.vitalFewCount).toBe(0);
  });

  it('trims whitespace from category names', () => {
    const result = analysePareto([
      { name: '  falls  ', count: 5 },
      { name: 'medication', count: 10 },
    ]);
    expect(result.categories.map((c) => c.name)).toEqual(['medication', 'falls']);
  });
});
