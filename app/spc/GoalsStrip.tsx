'use client';
// Plain-English strip above the chart showing how the latest data sits
// against the user's target. Hidden when no target is set or the chart
// kind doesn't support assurance reasoning (Pareto/Funnel, RunChart).

import { useMemo } from 'react';
import { analyseSpc } from '@/lib/spc';
import type { Measure } from '@/lib/project/types';

interface Props {
  measure: Measure;
}

interface Strip {
  targetText: string;
  currentMeanText: string;
  distanceText: string;
  distanceColor: string;
  forecast: string | null;
}

export default function GoalsStrip({ measure }: Props) {
  const strip = useMemo<Strip | null>(
    () => buildStrip(measure),
    // measure.data isn't a stable identity but the parent passes a fresh
    // object on every project mutation, which is the right re-compute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measure],
  );
  if (!strip) return null;

  return (
    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <Cell label="Target" value={strip.targetText} />
      <Cell label="Current mean" value={strip.currentMeanText} />
      <Cell
        label="Distance to target"
        value={strip.distanceText}
        valueColor={strip.distanceColor}
      />
      <Cell
        label="At current rate"
        value={strip.forecast ?? '—'}
        hint={strip.forecast ? undefined : 'Need at least 3 points showing a steady trend.'}
      />
    </div>
  );
}

function buildStrip(measure: Measure): Strip | null {
  if (measure.target === undefined || measure.target === null) return null;
  if (measure.chartKind === 'Pareto' || measure.chartKind === 'Funnel') return null;
  // The strip's "distance to target" / "at current rate" reasoning all
  // assumes a direction. Without an aim there's no favourable side, so
  // hide the strip entirely.
  if (measure.aim === 'none') return null;

  const sourceRows = measure.data
    .filter((d) => d?.date && d?.value !== '' && d?.value != null)
    .map((d) => ({
      date: d.date,
      value: Number(d.value),
      denominator:
        d?.denominator !== undefined && d?.denominator !== ''
          ? Number(d.denominator)
          : undefined,
      recalculate: Boolean(d?.comment?.recalculate),
    }))
    .filter((r) => Number.isFinite(r.value));
  if (sourceRows.length === 0) return null;

  const kind = (['RunChart', 'P', 'C', 'U'] as const).includes(
    measure.chartKind as 'RunChart' | 'P' | 'C' | 'U',
  )
    ? (measure.chartKind as 'RunChart' | 'P' | 'C' | 'U')
    : ('XmR' as const);
  const { analysis, plottedRows } = analyseSpc(sourceRows, { kind });
  if (analysis.segments.length === 0 || plottedRows.length === 0) return null;

  const latest = analysis.segments[analysis.segments.length - 1];
  const currentMean = latest.mean;
  const target = measure.target;
  const distance = currentMean - target;
  const aim = measure.aim;
  // "Favourable" = the chart's value is moving toward the target.
  const onCorrectSide =
    (aim === 'increase' && distance >= 0) || (aim === 'decrease' && distance <= 0);

  // Linear projection: estimate the slope from the latest segment, then
  // see how many periods it would take to close the gap. Only attempt
  // it when there are at least 3 points in the latest segment AND the
  // slope is actually moving toward the target.
  const segmentRows = plottedRows.slice(latest.startIndex, latest.endIndex + 1);
  const segValues = segmentRows.map((r) => r.value);
  let forecast: string | null = null;
  if (!onCorrectSide && segValues.length >= 3) {
    const n = segValues.length;
    const xs = segValues.map((_, i) => i);
    const xMean = (n - 1) / 2;
    const yMean = segValues.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (segValues[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const slopeIsHelpful =
      (aim === 'increase' && slope > 0) || (aim === 'decrease' && slope < 0);
    if (slopeIsHelpful) {
      const intercept = yMean - slope * xMean;
      const latestPredicted = intercept + slope * (n - 1);
      const periodsNeeded = (target - latestPredicted) / slope;
      if (Number.isFinite(periodsNeeded) && periodsNeeded > 0 && periodsNeeded < 240) {
        forecast = `~${Math.ceil(periodsNeeded)} ${periodLabel(measure.increment, Math.ceil(periodsNeeded))} to target`;
      } else {
        forecast = 'On the right path';
      }
    } else {
      forecast = 'Trend is flat or against the target';
    }
  } else if (onCorrectSide) {
    forecast = 'Target already met by the current mean';
  }

  return {
    targetText: fmt(target),
    currentMeanText: fmt(currentMean),
    distanceText: `${distance >= 0 ? '+' : ''}${fmt(distance)}`,
    distanceColor: onCorrectSide ? 'text-emerald-700' : 'text-amber-700',
    forecast,
  };
}

function periodLabel(increment: string | undefined, n: number): string {
  switch (increment) {
    case 'daily':
      return n === 1 ? 'day' : 'days';
    case 'weekly':
      return n === 1 ? 'week' : 'weeks';
    case 'monthly':
      return n === 1 ? 'month' : 'months';
    case 'yearly':
      return n === 1 ? 'year' : 'years';
    default:
      return n === 1 ? 'period' : 'periods';
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Number(n.toFixed(2)).toString();
}

function Cell({
  label,
  value,
  valueColor,
  hint,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`text-base font-semibold tabular-nums ${valueColor ?? 'text-gray-900'}`}>
        {value}
      </span>
      {hint && <span className="text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </div>
  );
}
