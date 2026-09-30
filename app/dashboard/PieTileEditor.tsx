'use client';

import { useEffect, useRef, useState } from 'react';
import type { PieTileConfig, PieLabelKind, Dataset, DashboardTheme } from '@/lib/dashboard/types';
import { paletteColors, newId } from '@/lib/dashboard/seed';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import DashPieChart from './charts/DashPieChart';
import TransformLogModal from './TransformLogModal';

interface PieTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  initialConfig?: PieTileConfig;
  onSave: (config: PieTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

const LABEL_OPTIONS: { value: PieLabelKind; label: string }[] = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'value', label: 'Value' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
];

function defaultConfig(datasets: Dataset[], colors: string[]): PieTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    categoryColumn: '',
    valueColumn: '',
    title: '',
    innerRadius: 0,
    labelKind: 'percentage',
    otherThreshold: 0,
    colors,
  };
}

function buildSlices(
  dataset: Dataset,
  categoryCol: string,
  valueCol: string,
  otherThreshold: number,
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const cat = String(row[categoryCol] ?? '').trim();
    if (!cat || cat === 'null') continue;
    if (valueCol) {
      map.set(cat, (map.get(cat) ?? 0) + (Number(row[valueCol]) || 0));
    } else {
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
  }
  const entries = Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  if (otherThreshold <= 0 || entries.length === 0) return entries;

  const total = entries.reduce((s, e) => s + e.value, 0);
  const main = entries.filter((e) => (e.value / total) * 100 >= otherThreshold);
  const other = entries.filter((e) => (e.value / total) * 100 < otherThreshold);
  if (other.length === 0) return main;
  const otherVal = other.reduce((s, e) => s + e.value, 0);
  return [...main, { label: 'Other', value: otherVal }];
}

export default function PieTileEditor({ datasets, theme, initialConfig, onSave, onCancel, onUpsertDataset }: PieTileEditorProps) {
  const palette = paletteColors(theme.palette, theme.customColours);
  const [config, setConfig] = useState<PieTileConfig>(initialConfig ?? defaultConfig(datasets, palette));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

  const INLINE_PREFIX = '__inline_';
  const INLINE_COLS: ColSpec[] = [
    { key: 'category', label: 'Category', type: 'text' },
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
    setConfig((c) => ({ ...c, datasetId: id, categoryColumn: 'category', valueColumn: 'value' }));
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

  const set = <K extends keyof PieTileConfig>(k: K, v: PieTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const textCols = dataset?.columns.filter((c) => c.type === 'text' || c.type === 'date') ?? [];
  const numCols = dataset?.columns.filter((c) => c.type === 'numeric') ?? [];

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const textCol = ds.columns.find((c) => c.type === 'text' || c.type === 'date');
    setConfig((c) => ({ ...c, datasetId: id, categoryColumn: textCol?.name ?? '', valueColumn: '' }));
  };

  const slices = dataset && config.categoryColumn
    ? buildSlices(dataset, config.categoryColumn, config.valueColumn, config.otherThreshold)
    : [];

  const canSave = dataSource === 'inline'
    ? inlineRows.length > 0
    : (!!config.datasetId && !!config.categoryColumn);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Pie / Donut chart</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <>
            {/* Data source */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Data source</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={() => setDataSource('dataset')}
                  className={`flex-1 text-xs py-1.5 transition-colors ${dataSource === 'dataset' ? 'bg-indigo-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Dataset
                </button>
                <button
                  type="button"
                  onClick={switchToInline}
                  className={`flex-1 text-xs py-1.5 transition-colors ${dataSource === 'inline' ? 'bg-indigo-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
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
                      <option value="">Select dataset…</option>
                      {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {dataset && <button type="button" onClick={() => setShowLog(true)} className="text-xs text-indigo-600 hover:underline mt-1">View transformations</button>}
                  </>
                )
              ) : (
                <InlineDataEditor columns={INLINE_COLS} rows={inlineRows} onChange={handleInlineChange} />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
              <input type="text" value={config.title} onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Complaints by type"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            {dataSource === 'dataset' && dataset && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category column</label>
                  <select value={config.categoryColumn} onChange={(e) => set('categoryColumn', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select column…</option>
                    {[...textCols, ...numCols].map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Value column <span className="font-normal text-gray-400">(optional — blank = count)</span>
                  </label>
                  <select value={config.valueColumn} onChange={(e) => set('valueColumn', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Count occurrences</option>
                    {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {slices.length > 0 && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                    {slices.length} slices · Total: {slices.reduce((s, x) => s + x.value, 0).toLocaleString()}
                  </p>
                )}
              </>
            )}

            {/* Inner radius — pie vs donut */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Style: {config.innerRadius === 0 ? 'Pie' : `Donut (${Math.round(config.innerRadius * 100)}% hole)`}
              </label>
              <input type="range" min={0} max={0.65} step={0.05} value={config.innerRadius}
                onChange={(e) => set('innerRadius', Number(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Pie</span><span>Donut</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slice labels</label>
              <div className="flex flex-wrap gap-1.5">
                {LABEL_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => set('labelKind', o.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${config.labelKind === o.value ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other threshold */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Group small slices into &ldquo;Other&rdquo; — below{' '}
                <span className="text-indigo-600">{config.otherThreshold}%</span>
                {config.otherThreshold === 0 && ' (off)'}
              </label>
              <input type="range" min={0} max={20} step={1} value={config.otherThreshold}
                onChange={(e) => set('otherThreshold', Number(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>Off</span><span>20%</span>
              </div>
            </div>
          </>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" disabled={!canSave} onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div ref={previewRef} className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm">
          {slices.length > 0 ? (
            <DashPieChart
              slices={slices}
              title={config.title}
              labelKind={config.labelKind}
              innerRadius={config.innerRadius}
              colors={config.colors.length > 0 ? config.colors : palette}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily={theme.fontFamily}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId ? 'Select a dataset' : !config.categoryColumn ? 'Select a category column' : 'No data found'}
            </div>
          )}
        </div>
      </div>

      {showLog && dataset && <TransformLogModal dataset={dataset} onClose={() => setShowLog(false)} />}
    </div>
  );
}
