'use client';

import { useEffect, useRef, useState } from 'react';
import type { LineTileConfig, Dataset, DashboardTheme, AnnotationDef } from '@/lib/dashboard/types';
import { paletteColors } from '@/lib/dashboard/seed';
import DashLineChart from './charts/DashLineChart';
import TransformLogModal from './TransformLogModal';
import ReferenceLinesPanel from './ReferenceLinesPanel';
import AnnotationsPanel from './AnnotationsPanel';
import { applyDateGrouping, DATE_GROUPING_LABELS, type DateGrouping } from '@/lib/dashboard/financialYear';

interface LineTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  annotations: AnnotationDef[];
  initialConfig?: LineTileConfig;
  initialThemeOverride?: Partial<DashboardTheme> | null;
  onSave: (config: LineTileConfig, themeOverride: Partial<DashboardTheme> | null) => void;
  onCancel: () => void;
}

const DEFAULT_COLORS = ['#005EB8', '#007f3b', '#d5281b', '#41B6E6', '#003087'];

function defaultConfig(datasets: Dataset[]): LineTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    xColumn: '',
    yColumns: [],
    title: '',
    xLabel: '',
    yLabel: '',
    colors: DEFAULT_COLORS,
    showPoints: true,
    referenceLines: [],
  };
}

export default function LineTileEditor({
  datasets,
  theme,
  annotations,
  initialConfig,
  initialThemeOverride,
  onSave,
  onCancel,
}: LineTileEditorProps) {
  const [config, setConfig] = useState<LineTileConfig>(
    initialConfig ?? defaultConfig(datasets),
  );
  const [useTheme, setUseTheme] = useState<boolean>(
    initialThemeOverride === undefined ? true : initialThemeOverride === null,
  );
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

  const set = <K extends keyof LineTileConfig>(k: K, v: LineTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const dateCols = dataset?.columns.filter((c) => c.type === 'date' || c.type === 'text') ?? [];
  const numCols = dataset?.columns.filter((c) => c.type === 'numeric') ?? [];

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const dateCol = ds.columns.find((c) => c.type === 'date' || c.type === 'text');
    const numCol = ds.columns.find((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      xColumn: dateCol?.name ?? '',
      yColumns: numCol ? [numCol.name] : [],
    }));
  };

  const toggleYColumn = (colName: string) => {
    setConfig((c) => ({
      ...c,
      yColumns: c.yColumns.includes(colName)
        ? c.yColumns.filter((y) => y !== colName)
        : [...c.yColumns, colName],
    }));
  };

  const updateColor = (idx: number, val: string) => {
    setConfig((c) => {
      const colors = [...c.colors];
      colors[idx] = val;
      return { ...c, colors };
    });
  };

  const canSave = config.datasetId && config.xColumn && config.yColumns.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Left: settings */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">Line chart</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Dataset */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                No datasets uploaded. Click &ldquo;Datasets&rdquo; in the toolbar first.
              </p>
            ) : (
              <select
                value={config.datasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— choose dataset —</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {dataset && (
            <>
              {/* X column */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  X-axis column (date or category)
                </label>
                <select
                  value={config.xColumn}
                  onChange={(e) => set('xColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— choose column —</option>
                  {dateCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Y columns (multi-select checkboxes) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Y-axis series (select one or more)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {numCols.length === 0 ? (
                    <p className="text-xs text-gray-400 p-1">No numeric columns in this dataset</p>
                  ) : (
                    numCols.map((c) => (
                      <label key={c.name} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={config.yColumns.includes(c.name)}
                          onChange={() => toggleYColumn(c.name)}
                          className="rounded border-gray-300 text-[#005EB8] focus:ring-[#005EB8]"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{c.name}</span>
                      </label>
                    ))
                  )}
                </div>
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
                {dataset && config.xColumn && (
                  /* Date grouping */
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Date grouping</label>
                    <select
                      value={config.dateGrouping ?? 'none'}
                      onChange={(e) => set('dateGrouping', e.target.value as DateGrouping)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {(Object.entries(DATE_GROUPING_LABELS) as [DateGrouping, string][]).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-0.5">FY grouping uses April start by default — change in Theme settings.</p>
                  </div>
                )}

                {dataset && config.yColumns.length > 0 && (
                  /* Series colours */
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-700">Series colours</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-xs text-gray-500">Use theme</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useTheme}
                          onClick={() => setUseTheme((v) => !v)}
                          className={`relative w-8 h-4 rounded-full transition-colors ${
                            useTheme ? 'bg-[#005EB8]' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                              useTheme ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </label>
                    </div>
                    {useTheme ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {paletteColors(theme.palette, theme.customColours).slice(0, 5).map((c) => (
                          <span key={c} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">Dashboard palette</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {config.yColumns.map((col, i) => (
                          <div key={col} className="flex items-center gap-2">
                            <input
                              type="color"
                              value={config.colors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                              onChange={(e) => updateColor(i, e.target.value)}
                              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                            />
                            <span className="text-xs text-gray-600 truncate">{col}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {dataset && (
                  /* Show points */
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Show data points</label>
                    <button
                      type="button"
                      onClick={() => set('showPoints', !config.showPoints)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        config.showPoints ? 'bg-[#005EB8]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          config.showPoints ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Reference lines */}
                <ReferenceLinesPanel
                  lines={config.referenceLines ?? []}
                  onChange={(referenceLines) => set('referenceLines', referenceLines)}
                />

                {/* Annotations */}
                <AnnotationsPanel
                  annotationIds={config.annotationIds ?? []}
                  annotations={annotations}
                  onChange={(annotationIds) => set('annotationIds', annotationIds)}
                />

                {/* Chart title */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Chart title</label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="Optional"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Axis labels */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">X-axis label</label>
                    <input
                      type="text"
                      value={config.xLabel}
                      onChange={(e) => set('xLabel', e.target.value)}
                      placeholder="Optional"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Y-axis label</label>
                    <input
                      type="text"
                      value={config.yLabel}
                      onChange={(e) => set('yLabel', e.target.value)}
                      placeholder="Optional"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex gap-2 sticky bottom-0 bg-white">
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
            onClick={() => onSave(config, useTheme ? null : {})}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          {dataset?.transformLog && dataset.transformLog.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="flex items-center gap-1 text-xs text-[#005EB8] hover:underline"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              How was this data processed?
            </button>
          )}
        </div>
        {showLog && dataset && (
          <TransformLogModal dataset={dataset} onClose={() => setShowLog(false)} />
        )}
        <div ref={previewRef} className="flex-1 p-6 flex items-center justify-center">
          {!config.xColumn || config.yColumns.length === 0 || !dataset ? (
            <p className="text-sm text-gray-400">Configure columns to see a preview</p>
          ) : (
            <div
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              style={{ width: previewSize.w, height: previewSize.h }}
            >
              <DashLineChart
                data={config.dateGrouping && config.dateGrouping !== 'none'
                  ? applyDateGrouping(dataset.rows, config.xColumn, config.yColumns, config.dateGrouping, theme.fyStartMonth ?? 4)
                  : dataset.rows}
                xColumn={config.xColumn}
                yColumns={config.yColumns}
                title={config.title}
                xLabel={config.xLabel}
                yLabel={config.yLabel}
                colors={(() => {
                  if (!useTheme) return config.colors;
                  const pal = paletteColors(theme.palette, theme.customColours);
                  return config.yColumns.map((_, i) => pal[i % pal.length] ?? config.colors[i] ?? '#005EB8');
                })()}
                showPoints={config.showPoints}
                referenceLines={config.referenceLines}
                annotations={annotations.filter((a) => (config.annotationIds ?? []).includes(a.id))}
                width={previewSize.w}
                height={previewSize.h}
                fontFamily={theme.fontFamily}
                showGridLines={theme.gridLines}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
