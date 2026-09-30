'use client';

import type {
  ChartConfig,
  Dataset,
  SpcTileConfig,
  BarTileConfig,
  LineTileConfig,
  RunTileConfig,
  ParetoTileConfig,
  HeatmapTileConfig,
  PieTileConfig,
  AreaTileConfig,
  ScatterTileConfig,
  FunnelTileConfig,
  GanttTileConfig,
  WaterfallTileConfig,
  PyramidTileConfig,
  BoxPlotTileConfig,
  CalendarHeatmapTileConfig,
  KpiTileConfig,
} from '@/lib/dashboard/types';
import { analyseFunnel, type FunnelInputUnit } from '@/lib/spc/funnel';

export interface TableData {
  caption: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export function extractTableData(chart: ChartConfig, datasets: Dataset[]): TableData | null {
  const ds = (id: string) => datasets.find((d) => d.id === id);

  if (chart.type === 'spc') {
    const { measure } = chart.config as SpcTileConfig;
    return {
      caption: measure.name || 'SPC chart data',
      headers: ['Date', 'Value', ...(measure.data.some((r) => r.denominator) ? ['Denominator'] : [])],
      rows: measure.data.map((r) => [r.date, r.value, r.denominator ?? null].filter((_, i, a) => i < a.length - 1 || r.denominator != null) as (string | number | null)[]),
    };
  }

  if (chart.type === 'kpi') {
    const c = chart.config as KpiTileConfig;
    const rows: (string | number | null)[][] = [[c.label || 'Value', c.value ?? '—', c.unit || '']];
    if (c.comparisonValue != null) rows.push([c.comparisonLabel || 'Comparison', c.comparisonValue, c.unit || '']);
    return { caption: chart.name || 'KPI', headers: ['Metric', 'Value', 'Unit'], rows };
  }

  if (chart.type === 'bar') {
    const c = chart.config as BarTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.xColumn, c.yColumn],
      rows: dataset.rows.map((r) => [r[c.xColumn] ?? null, r[c.yColumn] ?? null]),
    };
  }

  if (chart.type === 'line') {
    const c = chart.config as LineTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.xColumn, ...c.yColumns],
      rows: dataset.rows.map((r) => [r[c.xColumn] ?? null, ...c.yColumns.map((col) => r[col] ?? null)]),
    };
  }

  if (chart.type === 'run') {
    const c = chart.config as RunTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.dateColumn, c.valueColumn],
      rows: dataset.rows.map((r) => [r[c.dateColumn] ?? null, r[c.valueColumn] ?? null]),
    };
  }

  if (chart.type === 'pareto') {
    const c = chart.config as ParetoTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    if (c.valueColumn) {
      const agg: Record<string, number> = {};
      for (const row of dataset.rows) {
        const cat = String(row[c.categoryColumn] ?? '');
        const val = Number(row[c.valueColumn]);
        if (cat) agg[cat] = (agg[cat] ?? 0) + (isFinite(val) ? val : 0);
      }
      const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let cum = 0;
      return {
        caption: c.title || chart.name,
        headers: [c.categoryColumn, c.valueColumn, 'Cumulative %'],
        rows: sorted.map(([cat, val]) => {
          cum += val;
          return [cat, val, Math.round((cum / total) * 1000) / 10];
        }),
      };
    } else {
      const counts: Record<string, number> = {};
      for (const row of dataset.rows) {
        const cat = String(row[c.categoryColumn] ?? '');
        if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let cum = 0;
      return {
        caption: c.title || chart.name,
        headers: [c.categoryColumn, 'Count', 'Cumulative %'],
        rows: sorted.map(([cat, count]) => {
          cum += count;
          return [cat, count, Math.round((cum / total) * 1000) / 10];
        }),
      };
    }
  }

  if (chart.type === 'heatmap') {
    const c = chart.config as HeatmapTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.rowColumn, c.colColumn, c.valueColumn],
      rows: dataset.rows.map((r) => [r[c.rowColumn] ?? null, r[c.colColumn] ?? null, r[c.valueColumn] ?? null]),
    };
  }

  if (chart.type === 'pie') {
    const c = chart.config as PieTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    if (c.valueColumn) {
      const agg: Record<string, number> = {};
      for (const row of dataset.rows) {
        const cat = String(row[c.categoryColumn] ?? '');
        const val = Number(row[c.valueColumn]);
        if (cat) agg[cat] = (agg[cat] ?? 0) + (isFinite(val) ? val : 0);
      }
      const total = Object.values(agg).reduce((s, v) => s + v, 0);
      return {
        caption: c.title || chart.name,
        headers: [c.categoryColumn, c.valueColumn, '%'],
        rows: Object.entries(agg).map(([cat, val]) => [cat, val, total > 0 ? Math.round((val / total) * 1000) / 10 : 0]),
      };
    } else {
      const counts: Record<string, number> = {};
      for (const row of dataset.rows) {
        const cat = String(row[c.categoryColumn] ?? '');
        if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
      }
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      return {
        caption: c.title || chart.name,
        headers: [c.categoryColumn, 'Count', '%'],
        rows: Object.entries(counts).map(([cat, count]) => [cat, count, total > 0 ? Math.round((count / total) * 1000) / 10 : 0]),
      };
    }
  }

  if (chart.type === 'area') {
    const c = chart.config as AreaTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.xColumn, ...c.yColumns],
      rows: dataset.rows.map((r) => [r[c.xColumn] ?? null, ...c.yColumns.map((col) => r[col] ?? null)]),
    };
  }

  if (chart.type === 'scatter') {
    const c = chart.config as ScatterTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const extraCols = [c.colorColumn, c.sizeColumn].filter(Boolean);
    return {
      caption: c.title || chart.name,
      headers: [c.xColumn, c.yColumn, ...extraCols],
      rows: dataset.rows.map((r) => [r[c.xColumn] ?? null, r[c.yColumn] ?? null, ...extraCols.map((col) => r[col] ?? null)]),
    };
  }

  if (chart.type === 'gantt') {
    const c = chart.config as GanttTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const extraCols = [c.colorColumn].filter(Boolean);
    return {
      caption: c.title || chart.name,
      headers: [c.labelColumn, c.startColumn, c.endColumn, ...extraCols],
      rows: dataset.rows
        .filter((r) => r[c.labelColumn] != null && r[c.startColumn] != null && r[c.endColumn] != null)
        .map((r) => [r[c.labelColumn] ?? null, r[c.startColumn] ?? null, r[c.endColumn] ?? null, ...extraCols.map((col) => r[col] ?? null)]),
    };
  }

  if (chart.type === 'funnel') {
    const c = chart.config as FunnelTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const inputUnits: FunnelInputUnit[] = [];
    for (const row of dataset.rows) {
      const name = String(row[c.nameColumn] ?? '').trim();
      const num = Number(row[c.numeratorColumn]);
      const den = Number(row[c.denominatorColumn]);
      if (name && isFinite(num) && isFinite(den) && den > 0) inputUnits.push({ name, numerator: num, denominator: den });
    }
    if (inputUnits.length < 2) return null;
    const analysis = analyseFunnel(inputUnits);
    const fmt = (v: number) => c.asPercentage ? `${(v * 100).toFixed(1)}%` : v.toFixed(4);
    return {
      caption: c.title || chart.name,
      headers: [c.nameColumn, c.denominatorColumn, 'Rate', 'UCL', 'LCL', 'Signal'],
      rows: analysis.units.map((u) => [
        u.name,
        u.denominator,
        fmt(u.rate),
        fmt(u.ucl),
        fmt(u.lcl),
        u.signal === 'high' ? 'Above UCL' : u.signal === 'low' ? 'Below LCL' : 'Within limits',
      ]),
    };
  }

  if (chart.type === 'waterfall') {
    const c = chart.config as WaterfallTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const rows: (string | number | null)[][] = [];
    let running = 0;
    for (const row of dataset.rows) {
      const label = String(row[c.labelColumn] ?? '');
      const value = Number(row[c.valueColumn]);
      const isSubtotal = c.subtotalColumn ? Boolean(row[c.subtotalColumn]) : false;
      if (!label || !isFinite(value)) continue;
      if (isSubtotal) {
        rows.push([label, running, 'Subtotal']);
      } else {
        running += value;
        rows.push([label, value, running]);
      }
    }
    return { caption: c.title || chart.name, headers: [c.labelColumn, 'Change', 'Running total'], rows };
  }

  if (chart.type === 'pyramid') {
    const c = chart.config as PyramidTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    return {
      caption: c.title || chart.name,
      headers: [c.ageBandColumn, c.maleColumn, c.femaleColumn],
      rows: dataset.rows.map((r) => [r[c.ageBandColumn] ?? null, r[c.maleColumn] ?? null, r[c.femaleColumn] ?? null]),
    };
  }

  if (chart.type === 'boxplot') {
    const c = chart.config as BoxPlotTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const headers = c.groupColumn ? [c.groupColumn, c.valueColumn] : [c.valueColumn];
    const rows = dataset.rows
      .filter((r) => r[c.valueColumn] != null && isFinite(Number(r[c.valueColumn])))
      .map((r) => c.groupColumn ? [r[c.groupColumn] ?? null, r[c.valueColumn] ?? null] : [r[c.valueColumn] ?? null]);
    return { caption: c.title || chart.name, headers, rows };
  }

  if (chart.type === 'calendar') {
    const c = chart.config as CalendarHeatmapTileConfig;
    const dataset = ds(c.datasetId);
    if (!dataset) return null;
    const map = new Map<string, number>();
    for (const row of dataset.rows) {
      const raw = row[c.dateColumn];
      if (raw == null) continue;
      const d = new Date(String(raw));
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      if (c.valueColumn) {
        const v = Number(row[c.valueColumn]);
        if (!isNaN(v)) map.set(key, (map.get(key) ?? 0) + v);
      } else {
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    const headers = ['Date', c.valueColumn || 'Count'];
    const rows = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => [date, value]);
    return { caption: c.title || chart.name, headers, rows };
  }

  return null;
}

const TABLE_TYPES = new Set(['spc', 'kpi', 'bar', 'line', 'run', 'pareto', 'heatmap', 'calendar', 'pie', 'area', 'scatter', 'funnel', 'gantt', 'waterfall', 'pyramid', 'boxplot', 'treemap', 'sankey']);

export function hasTableView(chartType: string): boolean {
  return TABLE_TYPES.has(chartType);
}

interface ChartDataTableProps {
  chart: ChartConfig;
  datasets: Dataset[];
}

export default function ChartDataTable({ chart, datasets }: ChartDataTableProps) {
  const tableData = extractTableData(chart, datasets);

  if (!tableData) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400 p-4">
        No tabular data available for this tile type.
      </div>
    );
  }

  const { caption, headers, rows } = tableData;

  return (
    <div className="h-full overflow-auto p-2">
      <table className="w-full text-xs border-collapse" aria-label={caption}>
        <caption className="text-left text-xs font-semibold text-gray-700 mb-1 pb-1 border-b border-gray-200 caption-top">
          {caption}
        </caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="text-left px-2 py-1.5 bg-gray-50 border border-gray-200 font-medium text-gray-700 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-2 py-1 border border-gray-100 text-gray-700 whitespace-nowrap"
                >
                  {cell == null ? <span className="text-gray-300 italic">—</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No data rows.</p>
      )}
    </div>
  );
}
