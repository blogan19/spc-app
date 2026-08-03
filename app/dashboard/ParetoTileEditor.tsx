'use client';

import { useEffect, useRef, useState } from 'react';
import type { ParetoTileConfig, Dataset } from '@/lib/dashboard/types';
import { analysePareto, type ParetoInputCategory } from '@/lib/spc/pareto';
import { paletteColors } from '@/lib/dashboard/seed';
import type { DashboardTheme } from '@/lib/dashboard/types';
import DashParetoChart from './charts/DashParetoChart';
import TransformLogModal from './TransformLogModal';

interface ParetoTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  initialConfig?: ParetoTileConfig;
  onSave: (config: ParetoTileConfig) => void;
  onCancel: () => void;
}

function defaultConfig(datasets: Dataset[]): ParetoTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    categoryColumn: '',
    valueColumn: '',
    title: '',
    yLabel: '',
    showPercentage: false,
  };
}

function aggregateRows(dataset: Dataset, categoryCol: string, valueCol: string): ParetoInputCategory[] {
  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const cat = String(row[categoryCol] ?? '').trim();
    if (!cat || cat === 'null') continue;
    if (valueCol) {
      const v = Number(row[valueCol]) || 0;
      map.set(cat, (map.get(cat) ?? 0) + v);
    } else {
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

export default function ParetoTileEditor({
  datasets,
  theme,
  initialConfig,
  onSave,
  onCancel,
}: ParetoTileEditorProps) {
  const [config, setConfig] = useState<ParetoTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setPreviewSize({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof ParetoTileConfig>(k: K, v: ParetoTileConfig[K]) =>
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

  const inputRows = dataset && config.categoryColumn
    ? aggregateRows(dataset, config.categoryColumn, config.valueColumn)
    : [];

  const analysis = inputRows.length > 0 ? analysePareto(inputRows) : null;
  const chartColor = paletteColors(theme.palette, theme.customColours)[0] ?? '#005EB8';

  const canSave = !!config.datasetId && !!config.categoryColumn;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Settings panel */}
      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Pareto chart</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {datasets.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">
              No datasets uploaded yet. Close this editor and add data via &ldquo;Datasets&rdquo;.
            </p>
          ) : (
            <>
              {/* Dataset */}
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
                  <button
                    type="button"
                    onClick={() => setShowLog(true)}
                    className="text-xs text-[#005EB8] hover:underline mt-1"
                  >
                    View transformations
                  </button>
                )}
              </div>

              {dataset && (
                <>
                  {/* Category column */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category column</label>
                    <select
                      value={config.categoryColumn}
                      onChange={(e) => set('categoryColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select column…</option>
                      {[...textCols, ...numCols].map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      e.g. Complaint type, Incident category, Ward name
                    </p>
                  </div>

                  {/* Value column */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Value column <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <select
                      value={config.valueColumn}
                      onChange={(e) => set('valueColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Count occurrences (automatic)</option>
                      {numCols.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Leave blank to count how many times each category appears
                    </p>
                  </div>

                  {/* Aggregation summary */}
                  {analysis && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      {analysis.categories.length} categories · Total: {analysis.total.toLocaleString()}
                      {' · '}Vital few: {analysis.vitalFewCount} categor{analysis.vitalFewCount === 1 ? 'y' : 'ies'} = 80%
                    </div>
                  )}
                </>
              )}

              {/* Labels */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Complaint types — Jan to Jun 2025"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Y-axis label</label>
                <input
                  type="text"
                  value={config.yLabel}
                  onChange={(e) => set('yLabel', e.target.value)}
                  placeholder="e.g. Number of complaints"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Percentage toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showPercentage}
                  onChange={(e) => set('showPercentage', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#005EB8]"
                />
                <span className="text-sm text-gray-700">Show bars as percentage of total</span>
              </label>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div ref={previewRef} className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm">
          {analysis ? (
            <DashParetoChart
              analysis={analysis}
              title={config.title}
              yLabel={config.yLabel}
              showPercentage={config.showPercentage}
              width={previewSize.w}
              height={previewSize.h}
              color={chartColor}
              fontFamily={theme.fontFamily}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId
                ? 'Select a dataset to preview'
                : !config.categoryColumn
                  ? 'Select a category column'
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
