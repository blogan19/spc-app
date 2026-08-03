'use client';

import { useEffect, useRef, useState } from 'react';
import type { HeatmapTileConfig, HeatmapColorScheme, Dataset } from '@/lib/dashboard/types';
import DashHeatmapChart, { type HeatmapData } from './charts/DashHeatmapChart';
import TransformLogModal from './TransformLogModal';

interface HeatmapTileEditorProps {
  datasets: Dataset[];
  initialConfig?: HeatmapTileConfig;
  onSave: (config: HeatmapTileConfig) => void;
  onCancel: () => void;
}

const COLOR_OPTIONS: { value: HeatmapColorScheme; label: string; desc: string }[] = [
  { value: 'sequential-blue', label: 'Blue', desc: 'Light → dark blue' },
  { value: 'sequential-green', label: 'Green', desc: 'Light → dark green' },
  { value: 'sequential-orange', label: 'Orange', desc: 'Light → dark orange' },
  { value: 'diverging', label: 'Diverging (Red–Blue)', desc: 'Low = red · Mid = white · High = blue' },
];

function defaultConfig(datasets: Dataset[]): HeatmapTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    rowColumn: '',
    colColumn: '',
    valueColumn: '',
    title: '',
    colorScheme: 'sequential-blue',
    showValues: false,
  };
}

function buildHeatmapData(
  dataset: Dataset,
  rowCol: string,
  colCol: string,
  valueCol: string,
): { data: HeatmapData[]; rowOrder: string[]; colOrder: string[] } {
  const map = new Map<string, Map<string, number[]>>();
  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  for (const row of dataset.rows) {
    const r = String(row[rowCol] ?? '').trim();
    const c = String(row[colCol] ?? '').trim();
    const v = Number(row[valueCol]);
    if (!r || !c || isNaN(v)) continue;
    rowSet.add(r);
    colSet.add(c);
    if (!map.has(r)) map.set(r, new Map());
    const inner = map.get(r)!;
    if (!inner.has(c)) inner.set(c, []);
    inner.get(c)!.push(v);
  }

  const rowOrder = Array.from(rowSet);
  const colOrder = Array.from(colSet);
  const data: HeatmapData[] = [];

  for (const [rowLabel, inner] of map) {
    for (const [colLabel, vals] of inner) {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      data.push({ rowLabel, colLabel, value: avg });
    }
  }

  return { data, rowOrder, colOrder };
}

export default function HeatmapTileEditor({ datasets, initialConfig, onSave, onCancel }: HeatmapTileEditorProps) {
  const [config, setConfig] = useState<HeatmapTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setPreviewSize({
        w: Math.max(200, Math.floor(entry.contentRect.width)),
        h: Math.max(120, Math.floor(entry.contentRect.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof HeatmapTileConfig>(k: K, v: HeatmapTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const textCols = dataset?.columns.filter((c) => c.type === 'text' || c.type === 'date') ?? [];
  const numCols = dataset?.columns.filter((c) => c.type === 'numeric') ?? [];

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const cols = ds.columns;
    const text1 = cols.find((c) => c.type === 'text' || c.type === 'date');
    const text2 = cols.filter((c) => c.type === 'text' || c.type === 'date')[1];
    const numCol = cols.find((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      rowColumn: text1?.name ?? '',
      colColumn: text2?.name ?? '',
      valueColumn: numCol?.name ?? '',
    }));
  };

  const preview = dataset && config.rowColumn && config.colColumn && config.valueColumn
    ? buildHeatmapData(dataset, config.rowColumn, config.colColumn, config.valueColumn)
    : null;

  const canSave = !!config.datasetId && !!config.rowColumn && !!config.colColumn && !!config.valueColumn;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Settings panel */}
      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Heatmap</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {datasets.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">
              No datasets uploaded yet. Close this editor and add data via &ldquo;Datasets&rdquo;.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dataset</label>
                <select
                  value={config.datasetId}
                  onChange={(e) => handleDatasetChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select dataset…</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {dataset && (
                  <button type="button" onClick={() => setShowLog(true)} className="text-xs text-[#005EB8] hover:underline mt-1">
                    View transformations
                  </button>
                )}
              </div>

              {dataset && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Row (y-axis) column</label>
                    <select
                      value={config.rowColumn}
                      onChange={(e) => set('rowColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select column…</option>
                      {[...textCols, ...numCols].map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-0.5">e.g. Ward, Speciality</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Column (x-axis) column</label>
                    <select
                      value={config.colColumn}
                      onChange={(e) => set('colColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select column…</option>
                      {[...textCols, ...numCols].map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-0.5">e.g. Day of week, Month</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Value column (numeric)</label>
                    <select
                      value={config.valueColumn}
                      onChange={(e) => set('valueColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select column…</option>
                      {numCols.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-0.5">Multiple rows with the same row+column are averaged</p>
                  </div>

                  {preview && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      {preview.rowOrder.length} rows × {preview.colOrder.length} columns · {preview.data.length} cells
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Admissions by ward and day"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Colour scale</label>
                <div className="space-y-1.5">
                  {COLOR_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="colorScheme"
                        value={opt.value}
                        checked={config.colorScheme === opt.value}
                        onChange={() => set('colorScheme', opt.value)}
                        className="mt-0.5 accent-[#005EB8]"
                      />
                      <span className="text-sm text-gray-700">
                        {opt.label}
                        <span className="text-xs text-gray-400 block">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showValues}
                  onChange={(e) => set('showValues', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#005EB8]"
                />
                <span className="text-sm text-gray-700">Show values in cells</span>
              </label>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" disabled={!canSave} onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div ref={previewRef} className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm">
          {preview ? (
            <DashHeatmapChart
              data={preview.data}
              rowOrder={preview.rowOrder}
              colOrder={preview.colOrder}
              title={config.title}
              colorScheme={config.colorScheme}
              showValues={config.showValues}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily="Arial"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId ? 'Select a dataset to preview'
                : !config.rowColumn || !config.colColumn || !config.valueColumn
                  ? 'Map all three columns to see the chart'
                  : 'No data found'}
            </div>
          )}
        </div>
      </div>

      {showLog && dataset && (
        <TransformLogModal dataset={dataset} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}
