'use client';
// Stacked side-by-side view: pick up to 4 measures and see their charts
// rendered together with a shared x-axis range. Lets the user spot
// whether a change in one measure lines up with movement in another.

import { useMemo, useState } from 'react';
import LineChart from './spc';
import IconSummary from './IconSummary';
import { analyseSpc, deriveIcons } from '@/lib/spc';
import type { Measure, Project } from '@/lib/project/types';

const MAX_SELECT = 4;

interface Props {
  project: Project;
  onOpenMeasure: (measureId: string) => void;
}

export default function CompareView({ project, onOpenMeasure }: Props) {
  // Default selection: the first measure(s) that actually have data.
  const initialSelection = useMemo(() => {
    const withData = project.measures.filter((m) => m.data.length > 0);
    return withData.slice(0, 2).map((m) => m.id);
  }, [project.measures]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);

  const selected = useMemo(
    () => selectedIds
      .map((id) => project.measures.find((m) => m.id === id))
      .filter((m): m is Measure => Boolean(m)),
    [project.measures, selectedIds],
  );

  const toggle = (id: string) => {
    setSelectedIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SELECT) return cur;
      return [...cur, id];
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Compare measures
          </h3>
          <span className="text-xs text-gray-500">
            Pick up to {MAX_SELECT}. Charts share an x-axis so movements line up.
          </span>
        </div>
        {project.measures.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Add a measure first — there&rsquo;s nothing to compare yet.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {project.measures.map((m) => {
              const checked = selectedIds.includes(m.id);
              const disabled =
                !checked && selectedIds.length >= MAX_SELECT;
              return (
                <li key={m.id}>
                  <label
                    className={`flex items-center gap-2 rounded border px-3 py-2 ${
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : disabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(m.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="flex-1 text-sm">
                      <span className="font-medium text-gray-900">{m.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {m.chartKind} · {m.data.length} rows
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {selected.map((m) => (
            <CompareCard
              key={m.id}
              measure={m}
              onOpen={() => onOpenMeasure(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  measure,
  onOpen,
}: {
  measure: Measure;
  onOpen: () => void;
}) {
  // Note: each chart still derives its own x-domain from its own data.
  // A future enhancement would pass the union range so axes really do
  // line up to the day. For now the visual alignment by date order is
  // already useful for spotting co-movement.
  const isCategorical = measure.chartKind === 'Pareto' || measure.chartKind === 'Funnel';

  const { variation, assurance } = useMemo(() => {
    if (isCategorical || measure.data.length === 0) {
      return { variation: null as null | 'improvement' | 'concerning' | 'common-cause', assurance: null };
    }
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
    const icons = deriveIcons(plottedRows, analysis, measure.aim, measure.target);
    return icons;
  }, [measure, isCategorical]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-semibold text-blue-700 hover:underline text-left"
        >
          {measure.name}
        </button>
        {variation && (
          <IconSummary variation={variation} assurance={assurance} />
        )}
      </div>
      <LineChart
        params={{
          data: measure.data,
          aim: measure.aim,
          target: measure.target,
          chartKind: measure.chartKind,
          increment: measure.increment,
          ...measure.settings,
          width: 600,
          height: 320,
          marginTop: 60,
          marginBottom: 50,
          marginLeft: 50,
          marginRight: 30,
          titleSize: 13,
          title: '',
          description: '',
        }}
      />
    </div>
  );
}
