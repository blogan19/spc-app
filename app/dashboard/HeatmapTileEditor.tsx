'use client';

import { useEffect, useRef, useState } from 'react';
import type { HeatmapTileConfig, HeatmapColorScheme, Dataset } from '@/lib/dashboard/types';
import DashHeatmapChart, { type HeatmapData } from './charts/DashHeatmapChart';
import TransformLogModal from './TransformLogModal';
import { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface HeatmapTileEditorProps {
  datasets: Dataset[];
  initialConfig?: HeatmapTileConfig;
  onSave: (config: HeatmapTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
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

interface InlineRow { row: string; column: string; value: string }

function HeatmapInlineTable({ rows, onChange }: { rows: Record<string, string>[]; onChange: (rows: Record<string, string>[]) => void }) {
  const typed = rows as unknown as InlineRow[];
  const addRow = () => onChange([...rows, { row: '', column: '', value: '' }]);
  const update = (i: number, field: keyof InlineRow, val: string) => {
    const next = typed.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange(next as unknown as Record<string, string>[]);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Row (y-axis)</th>
            <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Column (x-axis)</th>
            <th className="text-left px-2 py-1.5 text-gray-500 font-medium">Value</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {typed.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              <td className="px-1 py-0.5">
                <input
                  type="text"
                  value={r.row}
                  onChange={(e) => update(i, 'row', e.target.value)}
                  placeholder="e.g. Ward A"
                  className="w-full px-1.5 py-1 rounded border border-transparent focus:border-indigo-300 focus:outline-none bg-transparent focus:bg-white text-xs"
                />
              </td>
              <td className="px-1 py-0.5">
                <input
                  type="text"
                  value={r.column}
                  onChange={(e) => update(i, 'column', e.target.value)}
                  placeholder="e.g. Monday"
                  className="w-full px-1.5 py-1 rounded border border-transparent focus:border-indigo-300 focus:outline-none bg-transparent focus:bg-white text-xs"
                />
              </td>
              <td className="px-1 py-0.5">
                <input
                  type="number"
                  value={r.value}
                  onChange={(e) => update(i, 'value', e.target.value)}
                  placeholder="0"
                  className="w-full px-1.5 py-1 rounded border border-transparent focus:border-indigo-300 focus:outline-none bg-transparent focus:bg-white text-xs"
                />
              </td>
              <td className="px-1 py-0.5 text-center">
                <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 leading-none">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-gray-200">
        <button
          type="button"
          onClick={addRow}
          className="w-full py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
        >
          + Add row
        </button>
      </div>
    </div>
  );
}

export default function HeatmapTileEditor({ datasets, initialConfig, onSave, onCancel, onUpsertDataset }: HeatmapTileEditorProps) {
  const [config, setConfig] = useState<HeatmapTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

  const INLINE_PREFIX = '__inline_';
  const INLINE_COLS: ColSpec[] = [
    { key: 'row', label: 'Row', type: 'text' },
    { key: 'column', label: 'Column', type: 'text' },
    { key: 'value', label: 'Value', type: 'number' },
  ];

  const isInline = (initialConfig?.datasetId ?? '').startsWith(INLINE_PREFIX);
  const [dataSource, setDataSource] = useState<'dataset' | 'inline'>(isInline ? 'inline' : 'dataset');
  const inlineId = useRef(isInline ? initialConfig!.datasetId! : INLINE_PREFIX + newId());
  const existingInlineDs = datasets.find((d) => d.id === inlineId.current);
  const [inlineRows, setInlineRows] = useState<Record<string, string>[]>(
    existingInlineDs?.rows?.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    ) ?? []
  );

  const handleInlineChange = (rows: Record<string, string>[]) => {
    setInlineRows(rows);
    onUpsertDataset(buildInlineDataset(inlineId.current, config.title || 'Inline data', INLINE_COLS, rows));
  };

  const switchToInline = () => {
    const id = inlineId.current;
    setDataSource('inline');
    setConfig((c) => ({ ...c, datasetId: id, rowColumn: 'row', colColumn: 'column', valueColumn: 'value' }));
    onUpsertDataset(buildInlineDataset(id, config.title || 'Inline data', INLINE_COLS, inlineRows));
  };

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

  const canSave = dataSource === 'inline'
    ? inlineRows.length > 0
    : !!config.datasetId && !!config.rowColumn && !!config.colColumn && !!config.valueColumn;

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
          {/* Data source */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Data source</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
              <button type="button" onClick={() => setDataSource('dataset')}
                className={`flex-1 text-xs py-1.5 transition-colors ${dataSource === 'dataset' ? 'bg-indigo-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Dataset
              </button>
              <button type="button" onClick={switchToInline}
                className={`flex-1 text-xs py-1.5 transition-colors ${dataSource === 'inline' ? 'bg-indigo-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Enter data
              </button>
            </div>
            {dataSource === 'dataset' ? (
              datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs text-slate-600">No datasets uploaded yet.</p>
                  <button
                    type="button"
                    onClick={switchToInline}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Enter data manually →
                  </button>
                  <p className="text-xs text-slate-400">or use the <strong>Data</strong> button in the toolbar to upload a file.</p>
                </div>
              ) : (
                <>
                  <select value={config.datasetId} onChange={(e) => handleDatasetChange(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">— choose dataset —</option>
                    {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {dataset && (
                    <button type="button" onClick={() => setShowLog(true)} className="text-xs text-indigo-600 hover:underline mt-1">
                      View transformations
                    </button>
                  )}
                </>
              )
            ) : (
              <HeatmapInlineTable rows={inlineRows} onChange={handleInlineChange} />
            )}
          </div>

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

          {dataSource === 'dataset' && dataset && (
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
                    className="mt-0.5 accent-indigo-600"
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
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">Show values in cells</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Colour scale range (optional)</label>
            <p className="text-xs text-gray-400 mb-2">Leave blank to auto-range from your data. Set fixed values when your data points are similar and you want meaningful colour differences.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-gray-500">Minimum</span>
                <input
                  type="number"
                  value={config.domainMin ?? ''}
                  onChange={(e) => set('domainMin', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="Auto"
                  className="mt-0.5 w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Maximum</span>
                <input
                  type="number"
                  value={config.domainMax ?? ''}
                  onChange={(e) => set('domainMax', e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="Auto"
                  className="mt-0.5 w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" disabled={!canSave} onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
              domainMin={config.domainMin}
              domainMax={config.domainMax}
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
