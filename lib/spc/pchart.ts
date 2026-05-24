// P-chart analysis. The metric is a proportion p_i = numerator_i / n_i.
// Centre is the *pooled* proportion p̄ = Σ numerator / Σ n (not the
// average of the per-row proportions — that would weight small samples
// the same as large ones). Limits vary per row because they depend on
// the row's sample size:
//
//   sigma_i = sqrt(p̄(1 − p̄) / n_i)
//   UCL_i   = clamp(p̄ + 3·sigma_i, 0, 1)
//   LCL_i   = clamp(p̄ − 3·sigma_i, 0, 1)
//
// Rows are segmented by the recalculate flag just like XmR.

import type {
  RuleHits,
  SpcAnalysis,
  SpcPointLimits,
  SpcRow,
  SpcSegment,
} from './types';
import { detectRules } from './rules';
import { median } from './xmr';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface SegmentPlan {
  startIndex: number;
  endIndex: number;
}

function planSegments(rows: readonly SpcRow[]): SegmentPlan[] {
  if (rows.length === 0) return [];
  const starts: number[] = [0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].recalculate) starts.push(i);
  }
  return starts.map((s, idx) => ({
    startIndex: s,
    endIndex: idx + 1 < starts.length ? starts[idx + 1] - 1 : rows.length - 1,
  }));
}

interface ProportionAnalysis {
  analysis: SpcAnalysis;
  proportionRows: SpcRow[]; // rows with value=proportion for plotting
}

export function analyseProportion(rows: readonly SpcRow[]): ProportionAnalysis {
  const plans = planSegments(rows);
  const segments: SpcSegment[] = [];
  const pointLimits: SpcPointLimits[] = new Array(rows.length);
  const proportionRows: SpcRow[] = rows.map((r) => {
    const n = r.denominator ?? 0;
    return {
      ...r,
      value: n > 0 ? r.value / n : 0,
    };
  });

  for (const { startIndex, endIndex } of plans) {
    let sumNum = 0;
    let sumDen = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      sumNum += rows[i].value;
      sumDen += rows[i].denominator ?? 0;
    }
    const pBar = sumDen > 0 ? sumNum / sumDen : 0;
    const pBarVariance = pBar * (1 - pBar);
    // Per-segment median of the plotted proportions (informational —
    // P-chart limits and rules still use the pooled proportion p̄).
    const segMedian = median(
      proportionRows.slice(startIndex, endIndex + 1).map((r) => r.value),
    );

    // Per-row limits within the segment.
    for (let i = startIndex; i <= endIndex; i++) {
      const n = rows[i].denominator ?? 0;
      const sigma = n > 0 ? Math.sqrt(pBarVariance / n) : 0;
      const ucl = clamp(pBar + 3 * sigma, 0, 1);
      const lcl = clamp(pBar - 3 * sigma, 0, 1);
      pointLimits[i] = { mean: pBar, median: segMedian, ucl, lcl };
    }

    // Segment header carries the centre; ucl/lcl on the segment object
    // are illustrative only (the *typical* limit at the segment's mean
    // sample size). The chart reads pointLimits for the actual lines.
    const meanN = sumDen / (endIndex - startIndex + 1);
    const segSigma = meanN > 0 ? Math.sqrt(pBarVariance / meanN) : 0;
    segments.push({
      startIndex,
      endIndex,
      mean: pBar,
      median: segMedian,
      meanMovingRange: 0,
      sigma: segSigma,
      ucl: clamp(pBar + 3 * segSigma, 0, 1),
      lcl: clamp(pBar - 3 * segSigma, 0, 1),
    });
  }

  // Rule detection runs against the proportions (consistent with the
  // limit space) — outsideLimits compares plotted proportion vs UCL/LCL,
  // run-above/below compares against the mean (= p̄).
  const rules: RuleHits = detectRules(proportionRows, pointLimits, 'P');

  return {
    analysis: { kind: 'P', segments, pointLimits, rules },
    proportionRows,
  };
}
