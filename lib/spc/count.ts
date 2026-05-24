// C and U charts — both rest on a Poisson assumption: the variance of a
// count of rare events equals its mean.
//
// C chart: counts per unit of constant exposure (e.g. incidents per ward-week).
//   centre = c̄ = mean(counts in the segment)
//   sigma  = √c̄                       (constant for the whole segment)
//   UCL    = c̄ + 3·sigma
//   LCL    = max(0, c̄ − 3·sigma)
//
// U chart: rates per varying exposure (e.g. incidents per 1000 bed-days).
//   plotted u_i = numerator_i / exposure_i
//   centre ū    = Σ numerator / Σ exposure       (pooled rate)
//   sigma_i     = √(ū / exposure_i)              (varies per row)
//   UCL_i       = ū + 3·sigma_i
//   LCL_i       = max(0, ū − 3·sigma_i)
//
// Rows are segmented by the recalculate flag just like XmR and P.

import type {
  AnalysisKind,
  RuleHits,
  SpcAnalysis,
  SpcPointLimits,
  SpcRow,
  SpcSegment,
} from './types';
import { detectRules } from './rules';
import { mean, median } from './xmr';

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

interface CountAnalysis {
  analysis: SpcAnalysis;
  plottedRows: SpcRow[];
}

export function analyseCount(rows: readonly SpcRow[]): CountAnalysis {
  const plans = planSegments(rows);
  const segments: SpcSegment[] = [];
  const pointLimits: SpcPointLimits[] = new Array(rows.length);

  for (const { startIndex, endIndex } of plans) {
    const segValues = rows.slice(startIndex, endIndex + 1).map((r) => r.value);
    const cBar = mean(segValues);
    const cMedian = median(segValues);
    const sigma = Math.sqrt(Math.max(0, cBar));
    const ucl = cBar + 3 * sigma;
    const lcl = Math.max(0, cBar - 3 * sigma);

    for (let i = startIndex; i <= endIndex; i++) {
      pointLimits[i] = { mean: cBar, median: cMedian, ucl, lcl };
    }
    segments.push({
      startIndex,
      endIndex,
      mean: cBar,
      median: cMedian,
      meanMovingRange: 0,
      sigma,
      ucl,
      lcl,
    });
  }

  const rules: RuleHits = detectRules(rows, pointLimits, 'C' satisfies AnalysisKind);
  return {
    analysis: { kind: 'C', segments, pointLimits, rules },
    // Plotted value is the raw count — same as the input.
    plottedRows: [...rows],
  };
}

interface RateAnalysis {
  analysis: SpcAnalysis;
  plottedRows: SpcRow[];
}

export function analyseRate(rows: readonly SpcRow[]): RateAnalysis {
  const plans = planSegments(rows);
  const segments: SpcSegment[] = [];
  const pointLimits: SpcPointLimits[] = new Array(rows.length);

  const plottedRows: SpcRow[] = rows.map((r) => {
    const n = r.denominator ?? 0;
    return {
      ...r,
      value: n > 0 ? r.value / n : 0,
    };
  });

  for (const { startIndex, endIndex } of plans) {
    let sumNum = 0;
    let sumExp = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      sumNum += rows[i].value;
      sumExp += rows[i].denominator ?? 0;
    }
    const uBar = sumExp > 0 ? sumNum / sumExp : 0;
    const segRateMedian = median(
      plottedRows.slice(startIndex, endIndex + 1).map((r) => r.value),
    );

    for (let i = startIndex; i <= endIndex; i++) {
      const exp = rows[i].denominator ?? 0;
      const sigma = exp > 0 ? Math.sqrt(uBar / exp) : 0;
      const ucl = uBar + 3 * sigma;
      const lcl = Math.max(0, uBar - 3 * sigma);
      pointLimits[i] = { mean: uBar, median: segRateMedian, ucl, lcl };
    }

    const meanExp = sumExp / (endIndex - startIndex + 1);
    const segSigma = meanExp > 0 ? Math.sqrt(uBar / meanExp) : 0;
    segments.push({
      startIndex,
      endIndex,
      mean: uBar,
      median: segRateMedian,
      meanMovingRange: 0,
      sigma: segSigma,
      ucl: uBar + 3 * segSigma,
      lcl: Math.max(0, uBar - 3 * segSigma),
    });
  }

  const rules: RuleHits = detectRules(plottedRows, pointLimits, 'U' satisfies AnalysisKind);
  return {
    analysis: { kind: 'U', segments, pointLimits, rules },
    plottedRows,
  };
}
