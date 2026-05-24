// The four MDC special-cause rules, applied against XmR limits.
//
// Each rule returns a sorted, de-duplicated list of row indices that
// participate in a triggered pattern.

import type { AnalysisKind, RuleHits, SpcPointLimits, SpcRow } from './types';

const RUN_ABOVE_BELOW_THRESHOLD = 7; // 7+ on one side of the mean
const DIRECTION_RUN_THRESHOLD = 6; // 6+ consecutive points moving the same way
const OUTER_THIRD_SIGMA_MULTIPLE = 2; // outer third = points beyond mean ± 2σ

// Rule 1: any single point outside its segment's process limits.
function outsideLimits(rows: readonly SpcRow[], limits: readonly SpcPointLimits[]): number[] {
  const hits: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const { ucl, lcl } = limits[i];
    if (rows[i].value > ucl || rows[i].value < lcl) hits.push(i);
  }
  return hits;
}

// Rule 2: 7+ consecutive points on the same side of the mean.
// Points exactly on the mean are skipped (they neither extend nor break a run).
// Runs reset across segment boundaries — a new mean means a new game.
function runAboveBelowMean(
  rows: readonly SpcRow[],
  limits: readonly SpcPointLimits[],
): number[] {
  const flagged = new Set<number>();
  let currentSide: 'above' | 'below' | null = null;
  let currentMean: number | null = null;
  let runStart = 0;
  let runLength = 0;

  const flushIfTriggered = () => {
    if (runLength >= RUN_ABOVE_BELOW_THRESHOLD) {
      for (let i = runStart; i < runStart + runLength; i++) flagged.add(i);
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const { mean } = limits[i];
    // Segment boundary: the mean changed compared with the previous row.
    if (currentMean !== null && mean !== currentMean) {
      flushIfTriggered();
      currentSide = null;
      runLength = 0;
    }
    currentMean = mean;

    const diff = rows[i].value - mean;
    if (diff === 0) continue;
    const side: 'above' | 'below' = diff > 0 ? 'above' : 'below';

    if (side === currentSide) {
      runLength++;
    } else {
      flushIfTriggered();
      currentSide = side;
      runStart = i;
      runLength = 1;
    }
  }
  flushIfTriggered();

  return Array.from(flagged).sort((a, b) => a - b);
}

// Rule 3: 6+ consecutive points all increasing or all decreasing.
// Equal consecutive values break the run. Returns the two directions
// separately so the chart can interpret them against the user's aim
// (an increasing run is good news when aim=increase, bad news otherwise).
function directionRuns(rows: readonly SpcRow[]): {
  increasing: number[];
  decreasing: number[];
} {
  const up = new Set<number>();
  const down = new Set<number>();
  if (rows.length < DIRECTION_RUN_THRESHOLD) {
    return { increasing: [], decreasing: [] };
  }

  let runStart = 0;
  let runLength = 1;
  let currentDir: 'up' | 'down' | null = null;

  const flushIfTriggered = () => {
    if (runLength >= DIRECTION_RUN_THRESHOLD && currentDir !== null) {
      const target = currentDir === 'up' ? up : down;
      for (let i = runStart; i < runStart + runLength; i++) target.add(i);
    }
  };

  for (let i = 1; i < rows.length; i++) {
    const delta = rows[i].value - rows[i - 1].value;
    const dir: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;

    if (dir === null) {
      // Plateau breaks any run. The current point starts a new singleton run.
      flushIfTriggered();
      currentDir = null;
      runStart = i;
      runLength = 1;
      continue;
    }

    if (dir === currentDir) {
      runLength++;
    } else {
      flushIfTriggered();
      currentDir = dir;
      runStart = i - 1; // a new monotonic run starts at the earlier of the pair
      runLength = 2;
    }
  }
  flushIfTriggered();

  return {
    increasing: Array.from(up).sort((a, b) => a - b),
    decreasing: Array.from(down).sort((a, b) => a - b),
  };
}

// Rule 4: 2 of any 3 consecutive points in the outer third on the same side.
// The outer third on the upper side is [mean + 2σ, +∞); on the lower side, (−∞, mean − 2σ].
// Sigma here is reconstructed from the limit half-width: (ucl − mean) / 3.
// When the rule fires we flag the matching points (those actually in the outer
// third), not the whole window.
function twoOfThreeOuterThird(
  rows: readonly SpcRow[],
  limits: readonly SpcPointLimits[],
): number[] {
  const flagged = new Set<number>();
  if (rows.length < 3) return [];

  const inOuterThird = (i: number): 'upper' | 'lower' | null => {
    const { mean, ucl } = limits[i];
    const sigma = (ucl - mean) / 3;
    if (sigma === 0) return null; // degenerate (flat data) — no zones
    const upperBoundary = mean + OUTER_THIRD_SIGMA_MULTIPLE * sigma;
    const lowerBoundary = mean - OUTER_THIRD_SIGMA_MULTIPLE * sigma;
    if (rows[i].value >= upperBoundary) return 'upper';
    if (rows[i].value <= lowerBoundary) return 'lower';
    return null;
  };

  for (let i = 0; i <= rows.length - 3; i++) {
    const z0 = inOuterThird(i);
    const z1 = inOuterThird(i + 1);
    const z2 = inOuterThird(i + 2);

    for (const side of ['upper', 'lower'] as const) {
      const matches: number[] = [];
      if (z0 === side) matches.push(i);
      if (z1 === side) matches.push(i + 1);
      if (z2 === side) matches.push(i + 2);
      if (matches.length >= 2) {
        for (const idx of matches) flagged.add(idx);
      }
    }
  }

  return Array.from(flagged).sort((a, b) => a - b);
}

export function detectRules(
  rows: readonly SpcRow[],
  limits: readonly SpcPointLimits[],
  kind: AnalysisKind = 'XmR',
): RuleHits {
  const directions = directionRuns(rows);
  if (kind === 'RunChart') {
    // No control limits ⇒ the limit-dependent rules don't apply.
    return {
      outsideLimits: [],
      runAboveBelowMean: runAboveBelowMean(rows, limits),
      increasingRun: directions.increasing,
      decreasingRun: directions.decreasing,
      twoOfThreeOuterThird: [],
    };
  }
  return {
    outsideLimits: outsideLimits(rows, limits),
    runAboveBelowMean: runAboveBelowMean(rows, limits),
    increasingRun: directions.increasing,
    decreasingRun: directions.decreasing,
    twoOfThreeOuterThird: twoOfThreeOuterThird(rows, limits),
  };
}
