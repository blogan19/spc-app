// Descriptive statistics for a measure. Intentionally aimed at
// non-statisticians: each field comes with a plain-English explanation
// so the UI can show "what this means" alongside the number. Pure
// function — no React, no DOM.

import type { SpcAnalysis, SpcRow } from './types';
import { mean, median, movingRanges } from './xmr';

export interface DescriptiveStat {
  /** Stable key for React lists / CSV columns. */
  key: string;
  /** Short label shown in the UI. */
  label: string;
  /** Formatted value (already rounded for display). */
  value: string;
  /** Raw number — useful if a caller wants to do its own formatting. */
  raw: number | null;
  /** One-line plain-English explanation. */
  explanation: string;
}

export interface DescriptiveStats {
  /** Whether there were enough rows to compute anything meaningful. */
  ok: boolean;
  stats: DescriptiveStat[];
}

const fmt = (n: number, decimals = 2): string => {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals).replace(/\.?0+$/, '');
};

function stddev(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) ** 2;
  return Math.sqrt(acc / values.length);
}

/**
 * Build the descriptive stats panel for a plotted series. `plotted`
 * should already be in the value space the chart uses (proportions for
 * P, rates for U etc.) so the headline numbers match what the user
 * sees.
 */
export function describePlottedRows(
  plotted: readonly SpcRow[],
  analysis: SpcAnalysis,
): DescriptiveStats {
  const values = plotted
    .map((r) => r.value)
    .filter((v): v is number => Number.isFinite(v));
  if (values.length === 0) {
    return { ok: false, stats: [] };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const m = mean(values);
  const med = median(values);
  const sd = stddev(values);
  const mRs = movingRanges(values);
  const mRBar = mRs.length === 0 ? 0 : mean(mRs);
  // XmR sigma estimate (Wheeler) — present even for non-XmR kinds for
  // transparency; the chart's actual limit logic is unchanged.
  const sigmaEstimate = mRBar / 1.128;

  const latestValue = values[values.length - 1];
  const latestSegment = analysis.segments[analysis.segments.length - 1];
  const latestMean = latestSegment?.mean ?? m;
  const distanceFromMean = latestValue - latestMean;

  const ruleHitCount =
    analysis.rules.outsideLimits.length +
    analysis.rules.runAboveBelowMean.length +
    analysis.rules.increasingRun.length +
    analysis.rules.decreasingRun.length +
    analysis.rules.twoOfThreeOuterThird.length;

  const stats: DescriptiveStat[] = [
    {
      key: 'count',
      label: 'Data points',
      value: String(values.length),
      raw: values.length,
      explanation:
        'How many observations the chart is built from. Eight is the typical minimum for any kind of trend conclusion; twenty is more reliable.',
    },
    {
      key: 'mean',
      label: 'Mean (average)',
      value: fmt(m),
      raw: m,
      explanation:
        'The arithmetic average — sum of all values divided by the count. Pulled by extreme values.',
    },
    {
      key: 'median',
      label: 'Median (middle)',
      value: fmt(med),
      raw: med,
      explanation:
        'The middle value when sorted. Half of points sit above, half below. Less sensitive to extreme values than the mean.',
    },
    {
      key: 'min',
      label: 'Lowest',
      value: fmt(min),
      raw: min,
      explanation: 'The smallest value observed.',
    },
    {
      key: 'max',
      label: 'Highest',
      value: fmt(max),
      raw: max,
      explanation: 'The largest value observed.',
    },
    {
      key: 'range',
      label: 'Range',
      value: fmt(range),
      raw: range,
      explanation:
        'Difference between the highest and lowest value. A quick read of how spread out your data is.',
    },
    {
      key: 'stddev',
      label: 'Standard deviation',
      value: fmt(sd),
      raw: sd,
      explanation:
        'How spread out values are around the mean. Roughly 95% of common-cause data sits within two standard deviations of the mean.',
    },
    {
      key: 'mRBar',
      label: 'Mean moving range (mR̄)',
      value: fmt(mRBar),
      raw: mRBar,
      explanation:
        'Average size of the change from one point to the next. SPC uses this — not the standard deviation — to estimate noise. Smaller means the process is steadier.',
    },
    {
      key: 'sigmaEstimate',
      label: 'Sigma estimate (mR̄ / 1.128)',
      value: fmt(sigmaEstimate),
      raw: sigmaEstimate,
      explanation:
        'The standard "noise" level used to draw the control limits. ±3 of these around the mean gives the upper and lower control limits.',
    },
    {
      key: 'latestValue',
      label: 'Latest value',
      value: fmt(latestValue),
      raw: latestValue,
      explanation: 'Your most recent data point.',
    },
    {
      key: 'distanceFromMean',
      label: 'Latest vs. current average',
      value: fmt(distanceFromMean),
      raw: distanceFromMean,
      explanation:
        'How far the most recent point sits above (+) or below (−) the current average. A guide, not a signal — the variation icon decides whether it actually matters.',
    },
    {
      key: 'segments',
      label: 'Phases',
      value: String(analysis.segments.length),
      raw: analysis.segments.length,
      explanation:
        'Number of distinct phases — created when you tick "Recalculate control lines" at a row. Each phase gets its own mean and limits.',
    },
    {
      key: 'signals',
      label: 'Signals detected',
      value: String(ruleHitCount),
      raw: ruleHitCount,
      explanation:
        'How many points triggered one of the four SPC rules (outside limits, long run on one side, trend, or 2-of-3 near a limit). Zero means the variation icon is "common cause".',
    },
  ];

  return { ok: true, stats };
}
