'use client'
// Lagged cross-correlation between two measures. Plan §7.2: the
// analyst-mode tool the NHS toolkit currently doesn't offer — "did
// agency staffing usage 3 weeks ago predict medication errors?"
//
// Conventions:
//   lag k  ⇒  ccf(x,y)_k = corr(x_t, y_{t+k})
//   lag > 0 ⇒ x leads y (x at t predicts y at t+k)
//   lag < 0 ⇒ y leads x

import { useMemo, useState } from 'react';
import {
  alignByDate,
  laggedCorrelation,
  peakLag,
  type DateValue,
  type LagResult,
} from '@/lib/spc';
import type { Measure, Project } from '@/lib/project/types';

interface Props {
  project: Project;
}

const SVG_W = 720;
const SVG_H = 280;
const PAD_LEFT = 50;
const PAD_RIGHT = 30;
const PAD_TOP = 30;
const PAD_BOTTOM = 50;

export default function CorrelationView({ project }: Props) {
  const measures = project.measures;
  const [aId, setAId] = useState<string>(measures[0]?.id ?? '');
  const [bId, setBId] = useState<string>(measures[1]?.id ?? measures[0]?.id ?? '');
  const [maxLag, setMaxLag] = useState<number>(12);

  const measureA = measures.find((m) => m.id === aId);
  const measureB = measures.find((m) => m.id === bId);

  const aSeries = useMemo(() => toSeries(measureA), [measureA]);
  const bSeries = useMemo(() => toSeries(measureB), [measureB]);

  const aligned = useMemo(() => {
    if (!aSeries.length || !bSeries.length) return null;
    return alignByDate(aSeries, bSeries);
  }, [aSeries, bSeries]);

  const lags = useMemo<LagResult[]>(() => {
    if (!aligned || aligned.dates.length < 3) return [];
    return laggedCorrelation(aligned.x, aligned.y, { maxLag });
  }, [aligned, maxLag]);

  const peak = useMemo(() => peakLag(lags), [lags]);
  const sameMeasure = aId === bId;

  if (measures.length < 2) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-base font-medium text-gray-900 mb-1">
          Need at least two measures
        </h2>
        <p className="text-sm text-gray-600">
          Add a second measure on the Measures tab. Lagged correlation needs two series with
          overlapping dates to compare.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Pick two measures to look for a lead/lag relationship. The correlogram below shows
        the Pearson correlation between the series at each lag. A peak at lag +k means
        the X series tends to lead the Y series by k periods.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <MeasurePicker
          label="X series (potential leading indicator)"
          value={aId}
          onChange={setAId}
          measures={measures}
        />
        <MeasurePicker
          label="Y series (potential trailing indicator)"
          value={bId}
          onChange={setBId}
          measures={measures}
        />
        <label className="flex flex-col">
          <span className="text-gray-600">Max lag</span>
          <input
            type="number"
            value={maxLag}
            min={1}
            max={60}
            onChange={(e) => setMaxLag(Math.max(1, Math.min(60, Number(e.target.value) || 12)))}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </label>
      </div>

      {sameMeasure && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          You've chosen the same measure for both series — the correlogram will show
          autocorrelation, which is informative for periodicity but not for lead/lag.
        </p>
      )}

      {!aligned || aligned.dates.length < 3 ? (
        <div className="bg-white border border-gray-200 rounded p-4 text-sm text-gray-600">
          The two series have fewer than 3 dates in common. Lagged correlation needs
          overlapping observations — either align the dates in the source data, or pick
          measures recorded on the same cadence.
          {aligned && aligned.dates.length > 0 && (
            <span> Currently overlapping: {aligned.dates.length} dates.</span>
          )}
        </div>
      ) : (
        <>
          <PeakCallout
            peak={peak}
            xName={measureA?.name ?? ''}
            yName={measureB?.name ?? ''}
            n={aligned.dates.length}
          />
          <Correlogram lags={lags} />
        </>
      )}
    </div>
  );
}

function toSeries(measure: Measure | undefined): DateValue[] {
  if (!measure) return [];
  return measure.data
    .filter((r) => r?.date && r?.value !== '' && r?.value != null)
    .map((r) => ({ date: r.date, value: Number(r.value) }))
    .filter((d) => Number.isFinite(d.value));
}

function MeasurePicker({
  label,
  value,
  onChange,
  measures,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  measures: Measure[];
}) {
  return (
    <label className="flex flex-col">
      <span className="text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1"
      >
        {measures.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PeakCallout({
  peak,
  xName,
  yName,
  n,
}: {
  peak: LagResult | null;
  xName: string;
  yName: string;
  n: number;
}) {
  if (!peak || !Number.isFinite(peak.r)) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
        No usable correlation — one of the series may be constant.
      </div>
    );
  }
  const verb =
    peak.lag === 0
      ? 'are most correlated with no lag'
      : peak.lag > 0
        ? `lead ${yName} by ${peak.lag} period${peak.lag === 1 ? '' : 's'}`
        : `lag ${yName} by ${-peak.lag} period${-peak.lag === 1 ? '' : 's'}`;
  const colour = peak.significant
    ? peak.r > 0
      ? 'bg-blue-50 border-blue-200 text-blue-900'
      : 'bg-orange-50 border-orange-200 text-orange-900'
    : 'bg-gray-50 border-gray-200 text-gray-700';
  return (
    <div className={`rounded p-3 text-sm border ${colour}`}>
      <span className="font-medium">{xName}</span> {peak.lag === 0 ? '' : 'appears to '}
      {verb} (r = {peak.r.toFixed(2)} at lag {peak.lag}, n = {peak.n}).
      {peak.significant ? (
        <>
          {' '}
          This exceeds the 2/√n threshold for white-noise — it's a real signal, not a
          random fluke at this dataset size.
        </>
      ) : (
        <>
          {' '}
          The magnitude doesn't exceed the 2/√n white-noise threshold — treat as
          suggestive, not conclusive.
        </>
      )}
      <span className="text-xs text-gray-500"> ({n} overlapping dates)</span>
    </div>
  );
}

function Correlogram({ lags }: { lags: LagResult[] }) {
  if (lags.length === 0) return null;

  const yMax = 1;
  const yMin = -1;
  const xDomain = [lags[0].lag, lags[lags.length - 1].lag];

  const plotW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const plotH = SVG_H - PAD_TOP - PAD_BOTTOM;

  const xScale = (lag: number) =>
    PAD_LEFT + ((lag - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotW;
  const yScale = (r: number) =>
    PAD_TOP + ((yMax - r) / (yMax - yMin)) * plotH;

  const barWidth = Math.max(2, (plotW / lags.length) * 0.7);
  const zeroY = yScale(0);

  // Approximate significance band per lag — uses the n at each lag.
  // Drawn as small ticks rather than a single horizontal line because
  // the bound varies slightly with the available paired observations.
  const significanceMarkers = lags.map((l) => {
    const bound = l.n > 0 ? 2 / Math.sqrt(l.n) : Infinity;
    return { lag: l.lag, bound: Math.min(1, bound) };
  });

  return (
    <div className="bg-white border border-gray-200 rounded p-3 overflow-x-auto">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Correlogram</h3>
      <svg width={SVG_W} height={SVG_H} className="block mx-auto">
        <rect width="100%" height="100%" fill="white" />

        {/* y-axis grid lines */}
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={SVG_W - PAD_RIGHT}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke={v === 0 ? '#374151' : '#e5e7eb'}
              strokeWidth={v === 0 ? 1 : 0.5}
            />
            <text
              x={PAD_LEFT - 6}
              y={yScale(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#6b7280"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Significance band — dashed lines at ±2/√n_max */}
        {(() => {
          const minN = lags.reduce((m, l) => (l.n > 0 ? Math.min(m, l.n) : m), Infinity);
          if (!Number.isFinite(minN)) return null;
          const bound = Math.min(1, 2 / Math.sqrt(minN));
          return (
            <>
              <line
                x1={PAD_LEFT}
                x2={SVG_W - PAD_RIGHT}
                y1={yScale(bound)}
                y2={yScale(bound)}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <line
                x1={PAD_LEFT}
                x2={SVG_W - PAD_RIGHT}
                y1={yScale(-bound)}
                y2={yScale(-bound)}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={SVG_W - PAD_RIGHT - 4}
                y={yScale(bound) - 3}
                textAnchor="end"
                fontSize={9}
                fill="#6b7280"
              >
                ±2/√n
              </text>
            </>
          );
        })()}

        {/* Bars */}
        {lags.map((l) => {
          if (!Number.isFinite(l.r)) return null;
          const x = xScale(l.lag) - barWidth / 2;
          const y = l.r >= 0 ? yScale(l.r) : zeroY;
          const h = Math.abs(yScale(l.r) - zeroY);
          const fill = l.r >= 0 ? '#3b82f6' : '#ef4444';
          const stroke = l.significant ? '#1f2937' : 'none';
          return (
            <rect
              key={l.lag}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth={l.significant ? 1.5 : 0}
            />
          );
        })}

        {/* x-axis ticks */}
        {lags
          .filter((l) => l.lag === 0 || Math.abs(l.lag) === 1 || l.lag % 2 === 0)
          .map((l) => (
            <text
              key={l.lag}
              x={xScale(l.lag)}
              y={SVG_H - PAD_BOTTOM + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {l.lag}
            </text>
          ))}

        <text
          x={SVG_W / 2}
          y={SVG_H - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#374151"
        >
          Lag (positive = X leads Y)
        </text>
        <text
          x={12}
          y={PAD_TOP + plotH / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#374151"
          transform={`rotate(-90 12 ${PAD_TOP + plotH / 2})`}
        >
          Pearson r
        </text>
      </svg>
      <p className="text-xs text-gray-500 mt-1">
        Outlined bars exceed the 2/√n white-noise band — they're unlikely to be a random
        artefact at this dataset size. Blue bars are positive correlations, red are
        negative.
      </p>
    </div>
  );
}
