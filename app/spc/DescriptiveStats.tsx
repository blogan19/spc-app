'use client';
// Compact descriptive stats for a measure. The chart card shows five
// "headline" cards inline; the full set with explanations lives behind
// an "See all stats" button that opens an off-canvas drawer.

import { useEffect, useMemo, useState } from 'react';
import { analyseSpc, describePlottedRows, describeVariation } from '@/lib/spc';
import type { DescriptiveStat } from '@/lib/spc';
import type { Measure } from '@/lib/project/types';

interface Props {
  measure: Measure;
}

// Headline keys, in the order they're rendered inline.
const HEADLINE_KEYS = [
  'count',
  'mean',
  'median',
  'range',
  'signals',
] as const;

export default function DescriptiveStats({ measure }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { stats: result, narrative } = useMemo(() => {
    const kind = (['RunChart', 'P', 'C', 'U'] as const).includes(
      measure.chartKind as 'RunChart' | 'P' | 'C' | 'U',
    )
      ? (measure.chartKind as 'RunChart' | 'P' | 'C' | 'U')
      : ('XmR' as const);
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
    const { analysis, plottedRows } = analyseSpc(sourceRows, { kind });
    return {
      stats: describePlottedRows(plottedRows, analysis),
      narrative: describeVariation(plottedRows, analysis, measure.aim),
    };
  }, [measure.chartKind, measure.data, measure.aim]);

  const isCategorical =
    measure.chartKind === 'Pareto' || measure.chartKind === 'Funnel';
  if (isCategorical) return null;

  const statsByKey = new Map<string, DescriptiveStat>();
  if (result.ok) for (const s of result.stats) statsByKey.set(s.key, s);
  const headline = HEADLINE_KEYS
    .map((k) => statsByKey.get(k))
    .filter((s): s is DescriptiveStat => Boolean(s));

  return (
    <>
      <section className="border border-gray-200 rounded-lg bg-white">
        <header className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Quick stats</h3>
          {result.ok && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-blue-700 hover:underline"
            >
              See all stats →
            </button>
          )}
        </header>
        <div className="p-3 space-y-3">
          {!result.ok ? (
            <p className="text-sm text-gray-500">
              Add some data and the summary will appear here.
            </p>
          ) : (
            <>
              {narrative && (
                <p className="text-sm leading-relaxed text-gray-700 bg-gray-50 border border-gray-100 rounded p-3">
                  {narrative}
                </p>
              )}
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {headline.map((s) => (
                  <li
                    key={s.key}
                    className="rounded border border-gray-100 bg-gray-50 px-3 py-2"
                    title={s.explanation}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">
                      {s.label}
                    </div>
                    <div className="text-base font-semibold text-gray-900 tabular-nums">
                      {s.value}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {drawerOpen && (
        <StatsDrawer onClose={() => setDrawerOpen(false)} stats={result.stats} />
      )}
    </>
  );
}

function StatsDrawer({
  onClose,
  stats,
}: {
  onClose: () => void;
  stats: DescriptiveStat[];
}) {
  // Lock body scroll while the drawer is open so the page behind doesn't
  // wander when the user scrolls the drawer contents.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close stats drawer"
        onClick={onClose}
        className="flex-1 bg-black/40"
      />
      {/* Panel */}
      <aside
        className="w-full max-w-md bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Descriptive statistics"
      >
        <header className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              All descriptive statistics
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              What each number means, in plain English.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto p-5 space-y-3">
          {stats.map((s) => (
            <div key={s.key} className="border border-gray-100 rounded p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-gray-700">{s.label}</span>
                <span className="text-base font-semibold text-gray-900 tabular-nums">
                  {s.value}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-gray-600">
                {s.explanation}
              </p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
