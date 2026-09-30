'use client';

import { useEffect, useRef, useState } from 'react';
import type { RunTileConfig, Dataset, AnnotationDef } from '@/lib/dashboard/types';
import LineChart from '@/app/spc/spc';
import TransformLogModal from './TransformLogModal';
import AnnotationsPanel from './AnnotationsPanel';

interface RunTileEditorProps {
  datasets: Dataset[];
  annotations: AnnotationDef[];
  initialConfig?: RunTileConfig;
  onSave: (config: RunTileConfig) => void;
  onCancel: () => void;
}

function defaultConfig(datasets: Dataset[]): RunTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    dateColumn: '',
    valueColumn: '',
    title: '',
    yLabel: '',
  };
}

function datasetToRows(dataset: Dataset, dateCol: string, valueCol: string) {
  return dataset.rows
    .filter((r) => r[dateCol] != null && r[valueCol] != null && r[valueCol] !== '')
    .map((r) => ({
      date: String(r[dateCol] ?? ''),
      value: String(r[valueCol] ?? ''),
      comment: { title: '', label: '', recalculate: false },
    }));
}

export default function RunTileEditor({ datasets, annotations, initialConfig, onSave, onCancel }: RunTileEditorProps) {
  const [config, setConfig] = useState<RunTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const set = <K extends keyof RunTileConfig>(k: K, v: RunTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const allCols = dataset?.columns ?? [];
  const dateCols = allCols.filter((c) => c.type === 'date' || c.type === 'text');
  const numCols = allCols.filter((c) => c.type === 'numeric');

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const dateCol = ds.columns.find((c) => c.type === 'date' || c.type === 'text');
    const numCol = ds.columns.find((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      dateColumn: dateCol?.name ?? '',
      valueColumn: numCol?.name ?? '',
    }));
  };

  const previewRows = dataset && config.dateColumn && config.valueColumn
    ? datasetToRows(dataset, config.dateColumn, config.valueColumn)
    : [];

  const canSave = !!config.datasetId && !!config.dateColumn && !!config.valueColumn;

  const logDataset = showLog ? dataset ?? null : null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Settings panel */}
      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Run chart</h2>
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
                    className="text-xs text-indigo-600 hover:underline mt-1"
                  >
                    View transformations
                  </button>
                )}
              </div>

              {/* Columns */}
              {dataset && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date / period column</label>
                    <select
                      value={config.dateColumn}
                      onChange={(e) => set('dateColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select column…</option>
                      {dateCols.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
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
                  </div>
                </>
              )}

              {/* Advanced settings toggle */}
              <div className="border-t border-gray-100 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 py-2"
                >
                  <span>&#9881; Advanced settings {showAdvanced ? '▴' : '▾'}</span>
                </button>

                {showAdvanced && (
                  <div className="pt-3 space-y-4">
                    {/* Chart title */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
                      <input
                        type="text"
                        value={config.title}
                        onChange={(e) => set('title', e.target.value)}
                        placeholder="e.g. Monthly ED Attendances"
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Y-axis label */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Y-axis label</label>
                      <input
                        type="text"
                        value={config.yLabel}
                        onChange={(e) => set('yLabel', e.target.value)}
                        placeholder="e.g. Attendances"
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Annotations */}
                    <AnnotationsPanel
                      annotationIds={config.annotationIds ?? []}
                      annotations={annotations}
                      onChange={(ids) => set('annotationIds', ids)}
                    />

                    {/* Info box */}
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5">
                      <p className="text-xs text-indigo-600 font-medium mb-1">About run charts</p>
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        A run chart plots data over time with a median line. Points are highlighted when they
                        trigger run or trend rules — a shift of 7+ points on one side of the median, or
                        7+ consecutive rising or falling values.
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
            className="flex-1 text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          {previewRows.length > 0 ? (
            <LineChart
              params={{
                data: previewRows,
                chartKind: 'RunChart',
                title: config.title,
                yAxisLabel: config.yLabel,
                width: previewSize.w,
                height: previewSize.h,
                marginTop: 40,
                marginBottom: 50,
                marginLeft: 56,
                marginRight: 24,
                titleSize: 14,
                axisLabelSize: 11,
                outlierStatus: true,
                showMean: true,
                showLimits: false,
                events: (config.annotationIds ?? [])
                  .map((id) => annotations.find((a) => a.id === id))
                  .filter(Boolean)
                  .map((a) => ({ date: a!.date, label: a!.label })),
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId
                ? 'Select a dataset to preview'
                : !config.dateColumn || !config.valueColumn
                  ? 'Map columns to see the chart'
                  : 'No data rows found for selected columns'}
            </div>
          )}
        </div>
      </div>

      {logDataset && (
        <TransformLogModal dataset={logDataset} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}
