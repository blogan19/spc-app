'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScatterTileConfig, Dataset, DashboardTheme } from '@/lib/dashboard/types';
import { paletteColors, newId } from '@/lib/dashboard/seed';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import DashScatterChart from './charts/DashScatterChart';
import TransformLogModal from './TransformLogModal';

interface ScatterTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  initialConfig?: ScatterTileConfig;
  onSave: (config: ScatterTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

function defaultConfig(datasets: Dataset[], color: string): ScatterTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    xColumn: '',
    yColumn: '',
    colorColumn: '',
    sizeColumn: '',
    title: '',
    xLabel: '',
    yLabel: '',
    pointColor: color,
  };
}

export default function ScatterTileEditor({ datasets, theme, initialConfig, onSave, onCancel, onUpsertDataset }: ScatterTileEditorProps) {
  const palette = paletteColors(theme.palette, theme.customColours);
  const [config, setConfig] = useState<ScatterTileConfig>(initialConfig ?? defaultConfig(datasets, palette[0] ?? '#005EB8'));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

  const INLINE_PREFIX = '__inline_';
  const INLINE_COLS: ColSpec[] = [
    { key: 'x', label: 'X', type: 'number' },
    { key: 'y', label: 'Y', type: 'number' },
    { key: 'label', label: 'Label (optional)', type: 'text' },
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
    setConfig((c) => ({ ...c, datasetId: id, xColumn: 'x', yColumn: 'y' }));
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

  const set = <K extends keyof ScatterTileConfig>(k: K, v: ScatterTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const allCols = dataset?.columns ?? [];
  const numCols = allCols.filter((c) => c.type === 'numeric');
  const catCols = allCols.filter((c) => c.type === 'text' || c.type === 'date');

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const nums = ds.columns.filter((c) => c.type === 'numeric');
    setConfig((c) => ({ ...c, datasetId: id, xColumn: nums[0]?.name ?? '', yColumn: nums[1]?.name ?? '', colorColumn: '', sizeColumn: '' }));
  };

  const canSave = dataSource === 'inline'
    ? inlineRows.length > 0
    : (!!config.datasetId && !!config.xColumn && !!config.yColumn);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Scatter plot</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              placeholder="e.g. Length of stay vs CQUIN score"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          {dataSource === 'dataset' && dataset && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">X axis</label>
                  <select value={config.xColumn} onChange={(e) => set('xColumn', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select…</option>
                    {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Y axis</label>
                  <select value={config.yColumn} onChange={(e) => set('yColumn', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="">Select…</option>
                    {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Colour by <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select value={config.colorColumn} onChange={(e) => set('colorColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Single colour</option>
                  {catCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Size by <span className="font-normal text-gray-400">(optional — bubble chart)</span>
                </label>
                <select value={config.sizeColumn} onChange={(e) => set('sizeColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Fixed size</option>
                  {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">X label</label>
              <input type="text" value={config.xLabel} onChange={(e) => set('xLabel', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Y label</label>
              <input type="text" value={config.yLabel} onChange={(e) => set('yLabel', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
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
          {dataset && config.xColumn && config.yColumn ? (
            <DashScatterChart
              data={dataset.rows}
              xColumn={config.xColumn}
              yColumn={config.yColumn}
              colorColumn={config.colorColumn}
              sizeColumn={config.sizeColumn}
              title={config.title}
              xLabel={config.xLabel}
              yLabel={config.yLabel}
              pointColor={config.pointColor}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily={theme.fontFamily}
              showGridLines={theme.gridLines}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId ? 'Select a dataset' : 'Map X and Y columns to see the chart'}
            </div>
          )}
        </div>
      </div>

      {showLog && dataset && <TransformLogModal dataset={dataset} onClose={() => setShowLog(false)} />}
    </div>
  );
}
