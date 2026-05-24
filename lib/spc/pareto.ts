// Pareto analysis. Categories sorted descending by count, with cumulative
// percentage and a "vital few" count (the smallest set of categories
// whose cumulative share crosses the threshold — 80% by default).
//
// Conceptually a different chart from XmR/P/C/U/Run: no time axis, no
// control limits, no rules. Lives in lib/spc/ alongside the others
// because the workspace treats all chart kinds uniformly.

export interface ParetoInputCategory {
  name: string;
  count: number;
}

export interface ParetoCategory {
  name: string;
  count: number;
  percentage: number; // 0..100, of total
  cumulativePercentage: number; // 0..100, running
}

export interface ParetoAnalysis {
  categories: ParetoCategory[]; // sorted descending by count
  total: number;
  /** Number of categories whose cumulative share first crosses the threshold. */
  vitalFewCount: number;
  vitalFewThreshold: number;
}

export interface ParetoOptions {
  /** Cumulative-percentage threshold for the vital-few set. Default 80. */
  threshold?: number;
}

export function analysePareto(
  rows: readonly ParetoInputCategory[],
  options: ParetoOptions = {},
): ParetoAnalysis {
  const threshold = options.threshold ?? 80;

  const valid = rows
    .map((r) => ({ name: (r.name ?? '').trim(), count: Number(r.count) || 0 }))
    .filter((r) => r.name !== '' && r.count > 0);

  valid.sort((a, b) => b.count - a.count);

  const total = valid.reduce((s, r) => s + r.count, 0);

  let cumPct = 0;
  const categories: ParetoCategory[] = valid.map((r) => {
    const pct = total > 0 ? (r.count / total) * 100 : 0;
    cumPct += pct;
    return {
      name: r.name,
      count: r.count,
      percentage: pct,
      cumulativePercentage: cumPct,
    };
  });

  let vitalFewCount = categories.findIndex(
    (c) => c.cumulativePercentage >= threshold,
  );
  vitalFewCount = vitalFewCount === -1 ? categories.length : vitalFewCount + 1;

  return {
    categories,
    total,
    vitalFewCount,
    vitalFewThreshold: threshold,
  };
}
