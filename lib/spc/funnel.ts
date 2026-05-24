// Funnel plot. Cross-sectional comparison of units (wards, trusts,
// hospitals) on a proportion. The natural variation in a unit's rate
// depends on its sample size: small denominators have wide natural
// variation, large denominators have tight. The funnel makes that
// explicit by widening at small n.
//
// Binomial limits (P-chart formula):
//   p̄        = Σ numerator / Σ denominator  (pooled)
//   σ(n)     = √(p̄(1 − p̄) / n)
//   UCL(n)   = clamp(p̄ + 3·σ(n), 0, 1)
//   LCL(n)   = clamp(p̄ − 3·σ(n), 0, 1)
//
// Units whose rate falls outside UCL/LCL are flagged as special-cause
// (high or low). Same idea as MDC: Strengthening's funnel example.

export interface FunnelInputUnit {
  name: string;
  numerator: number;
  denominator: number;
}

export interface FunnelUnit {
  name: string;
  numerator: number;
  denominator: number;
  rate: number; // numerator / denominator
  ucl: number;
  lcl: number;
  /** 'high' if rate > UCL, 'low' if rate < LCL, null otherwise. */
  signal: 'high' | 'low' | null;
}

export interface FunnelCurvePoint {
  n: number;
  ucl: number;
  lcl: number;
}

export interface FunnelAnalysis {
  units: FunnelUnit[];
  pooledRate: number;
  curve: FunnelCurvePoint[]; // sampled across the denominator range
  /** Range of denominators across the input — convenient for axis sizing. */
  denominatorRange: { min: number; max: number };
}

export interface FunnelOptions {
  /** Number of samples to draw the smooth curve with. Default 100. */
  samples?: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function analyseFunnel(
  rows: readonly FunnelInputUnit[],
  options: FunnelOptions = {},
): FunnelAnalysis {
  const valid = rows
    .map((r) => ({
      name: (r.name ?? '').trim(),
      numerator: Number(r.numerator) || 0,
      denominator: Number(r.denominator) || 0,
    }))
    .filter((r) => r.name !== '' && r.denominator > 0 && r.numerator >= 0);

  const sumNum = valid.reduce((s, r) => s + r.numerator, 0);
  const sumDen = valid.reduce((s, r) => s + r.denominator, 0);
  const pBar = sumDen > 0 ? sumNum / sumDen : 0;
  const variance = pBar * (1 - pBar);

  const sigmaForN = (n: number) => (n > 0 ? Math.sqrt(variance / n) : 0);

  const units: FunnelUnit[] = valid.map((r) => {
    const rate = r.numerator / r.denominator;
    const sigma = sigmaForN(r.denominator);
    const ucl = clamp01(pBar + 3 * sigma);
    const lcl = clamp01(pBar - 3 * sigma);
    return {
      ...r,
      rate,
      ucl,
      lcl,
      signal: rate > ucl ? 'high' : rate < lcl ? 'low' : null,
    };
  });

  // Sample the curve across the denominator range. Use a smooth set of
  // sample points so the funnel renders as a continuous curve.
  const samples = Math.max(10, options.samples ?? 100);
  const denoms = valid.map((r) => r.denominator);
  const minN = denoms.length > 0 ? Math.max(1, Math.min(...denoms)) : 1;
  const maxN = denoms.length > 0 ? Math.max(...denoms) : minN + 1;
  const span = Math.max(1, maxN - minN);

  const curve: FunnelCurvePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const n = minN + (i / samples) * span;
    const sigma = sigmaForN(n);
    curve.push({
      n,
      ucl: clamp01(pBar + 3 * sigma),
      lcl: clamp01(pBar - 3 * sigma),
    });
  }

  return {
    units,
    pooledRate: pBar,
    curve,
    denominatorRange: { min: minN, max: maxN },
  };
}
