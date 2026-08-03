'use client';

import type { Dataset, ScorecardTileConfig, ScorecardRowConfig } from '@/lib/dashboard/types';

function ragForValue(value: number, cfg: ScorecardRowConfig): 'green' | 'amber' | 'red' {
  if (cfg.higherIsBetter) {
    if (value >= cfg.greenThreshold) return 'green';
    if (value >= cfg.amberThreshold) return 'amber';
    return 'red';
  } else {
    if (value <= cfg.greenThreshold) return 'green';
    if (value <= cfg.amberThreshold) return 'amber';
    return 'red';
  }
}

const CELL_BG: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-green-100 text-green-900',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-900',
};

interface DashScorecardChartProps {
  dataset: Dataset;
  config: ScorecardTileConfig;
  fontFamily?: string;
}

export default function DashScorecardChart({ dataset, config, fontFamily = 'Arial' }: DashScorecardChartProps) {
  const { labelColumn, periodColumns, rowConfigs, showTrend, title } = config;

  if (!labelColumn || periodColumns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Select label and period columns to preview
      </div>
    );
  }

  // Gather label order and aggregate values per label+period
  const labelOrder: string[] = [];
  const labelSet = new Set<string>();
  const valueMap = new Map<string, Map<string, number[]>>();

  for (const row of dataset.rows) {
    const label = String(row[labelColumn] ?? '').trim();
    if (!label) continue;
    if (!labelSet.has(label)) {
      labelOrder.push(label);
      labelSet.add(label);
      valueMap.set(label, new Map());
    }
    const inner = valueMap.get(label)!;
    for (const col of periodColumns) {
      const v = Number(row[col]);
      if (!isNaN(v)) {
        if (!inner.has(col)) inner.set(col, []);
        inner.get(col)!.push(v);
      }
    }
  }

  if (labelOrder.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No data rows found
      </div>
    );
  }

  const avg = (vals: number[]) =>
    vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily }}>
      {title && (
        <p className="flex-shrink-0 text-xs font-semibold text-gray-700 px-3 pt-2 pb-1 truncate">{title}</p>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 sticky top-0 z-10">
              <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 min-w-[140px] whitespace-nowrap">
                Metric
              </th>
              {periodColumns.map((col) => (
                <th
                  key={col}
                  className="text-right px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 min-w-[80px] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labelOrder.map((label) => {
              const cfg = rowConfigs.find((r) => r.label === label);
              const inner = valueMap.get(label)!;

              return (
                <tr key={label} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{label}</td>
                  {periodColumns.map((col, ci) => {
                    const vals = inner.get(col) ?? [];
                    const value = avg(vals);
                    const rag = cfg && value !== null ? ragForValue(value, cfg) : null;
                    const cellClass = rag ? CELL_BG[rag] : 'text-slate-600';

                    let trendEl: React.ReactNode = null;
                    if (showTrend && ci > 0 && value !== null) {
                      const prevVals = inner.get(periodColumns[ci - 1]) ?? [];
                      const prev = avg(prevVals);
                      if (prev !== null) {
                        const diff = value - prev;
                        if (Math.abs(diff) > 0.001) {
                          const up = diff > 0;
                          const good = cfg ? (cfg.higherIsBetter ? up : !up) : up;
                          trendEl = (
                            <span className={`ml-0.5 text-[10px] ${good ? 'text-green-600' : 'text-red-600'}`}>
                              {up ? '▲' : '▼'}
                            </span>
                          );
                        }
                      }
                    }

                    const dp = cfg?.decimalPlaces ?? 1;
                    const unit = cfg?.unit ?? '';
                    const formatted = value !== null ? `${value.toFixed(dp)}${unit}` : '—';

                    return (
                      <td key={col} className={`px-3 py-2 text-right font-mono tabular-nums ${cellClass}`}>
                        <span>{formatted}</span>{trendEl}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
