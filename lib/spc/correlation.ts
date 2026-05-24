// Lagged cross-correlation between two time-aligned series. Plan §7.2
// names this as one of the analyst-mode tools that the NHS toolkit
// doesn't currently offer: "did agency staffing usage 3 weeks ago
// predict medication errors?"
//
// Convention: laggedCorrelation(x, y, k) at lag = k correlates x[t]
// with y[t + k].
//   * lag > 0 ⇒ y leads x by k periods (y at t+k predicts x at t)
//   * lag < 0 ⇒ x leads y by |k| periods (x at t predicts y at t+|k|)
//
// Significance check: |r| ≥ 2/√n (Bartlett's rule of thumb for the
// 95% band of a white-noise series). A coarse filter — the user sees
// the magnitudes and can apply judgement.

export function meanOf(arr: readonly number[]): number {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function pearson(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length || x.length < 2) return NaN;
  const mx = meanOf(x);
  const my = meanOf(y);
  let num = 0;
  let sx2 = 0;
  let sy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    sx2 += dx * dx;
    sy2 += dy * dy;
  }
  if (sx2 === 0 || sy2 === 0) return NaN;
  return num / Math.sqrt(sx2 * sy2);
}

export interface DateValue {
  date: string;
  value: number;
}

export interface AlignedSeries {
  dates: string[]; // sorted, intersection of the two inputs
  x: number[];
  y: number[];
}

/**
 * Take two date-tagged series and return the dates they have in
 * common, sorted ascending, with the value arrays aligned. Duplicate
 * dates in either input are collapsed to the last value seen.
 */
export function alignByDate(
  a: readonly DateValue[],
  b: readonly DateValue[],
): AlignedSeries {
  const aMap = new Map<string, number>();
  for (const d of a) aMap.set(d.date, d.value);
  const bMap = new Map<string, number>();
  for (const d of b) bMap.set(d.date, d.value);
  const dates = Array.from(aMap.keys())
    .filter((d) => bMap.has(d))
    .sort();
  const x: number[] = [];
  const y: number[] = [];
  for (const date of dates) {
    x.push(aMap.get(date) as number);
    y.push(bMap.get(date) as number);
  }
  return { dates, x, y };
}

export interface LagResult {
  lag: number;
  /** Pearson r for the paired observations at this lag; NaN if degenerate. */
  r: number;
  /** Number of paired observations contributing to this lag. */
  n: number;
  /** |r| meets the 2/√n rule-of-thumb threshold for the 95% white-noise band. */
  significant: boolean;
}

export interface CorrelogramOptions {
  /** Hard cap on |lag|. Default min(20, ⌊len/2⌋). */
  maxLag?: number;
}

/**
 * Correlogram of two equal-length aligned series. Returns one result
 * per lag in [-maxLag, +maxLag].
 */
export function laggedCorrelation(
  x: readonly number[],
  y: readonly number[],
  options: CorrelogramOptions = {},
): LagResult[] {
  const len = Math.min(x.length, y.length);
  if (len < 3) return [];
  const cap = options.maxLag ?? 20;
  const lagBound = Math.min(cap, Math.floor(len / 2));
  const results: LagResult[] = [];

  for (let lag = -lagBound; lag <= lagBound; lag++) {
    const xs: number[] = [];
    const ys: number[] = [];
    if (lag >= 0) {
      // x[t] paired with y[t + lag]
      for (let t = 0; t + lag < len; t++) {
        xs.push(x[t]);
        ys.push(y[t + lag]);
      }
    } else {
      const k = -lag;
      // x[t + k] paired with y[t]
      for (let t = 0; t + k < len; t++) {
        xs.push(x[t + k]);
        ys.push(y[t]);
      }
    }
    const n = xs.length;
    const r = pearson(xs, ys);
    const critical = n > 0 ? 2 / Math.sqrt(n) : Infinity;
    const significant = Number.isFinite(r) && Math.abs(r) >= critical;
    results.push({ lag, r, n, significant });
  }
  return results;
}

/** Pick the lag with the largest |r| from a correlogram. */
export function peakLag(results: readonly LagResult[]): LagResult | null {
  let best: LagResult | null = null;
  for (const r of results) {
    if (!Number.isFinite(r.r)) continue;
    if (best === null || Math.abs(r.r) > Math.abs(best.r)) best = r;
  }
  return best;
}
