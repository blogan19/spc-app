'use client';

import { useEffect, useRef, useState } from 'react';
import type { GanttTileConfig, Dataset } from '@/lib/dashboard/types';
import { paletteColors } from '@/lib/dashboard/seed';
import type { DashboardTheme } from '@/lib/dashboard/types';
import DashGanttChart, { type GanttTask } from './charts/DashGanttChart';

interface GanttTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  initialConfig?: GanttTileConfig;
  onSave: (config: GanttTileConfig) => void;
  onCancel: () => void;
}

function defaultConfig(datasets: Dataset[]): GanttTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    labelColumn: '',
    startColumn: '',
    endColumn: '',
    colorColumn: '',
    title: '',
    showToday: true,
    colors: [],
  };
}

function tryParseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export default function GanttTileEditor({
  datasets,
  theme,
  initialConfig,
  onSave,
  onCancel,
}: GanttTileEditorProps) {
  const [config, setConfig] = useState<GanttTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 360 });

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

  const set = <K extends keyof GanttTileConfig>(k: K, v: GanttTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const allCols = dataset?.columns ?? [];
  const dateCols = allCols.filter((c) => c.type === 'date');
  const textCols = allCols.filter((c) => c.type === 'text' || c.type === 'date');

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) return;
    const dc = ds.columns.filter((c) => c.type === 'date');
    const tc = ds.columns.filter((c) => c.type === 'text');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      labelColumn: tc[0]?.name ?? '',
      startColumn: dc[0]?.name ?? '',
      endColumn: dc[1]?.name ?? dc[0]?.name ?? '',
      colorColumn: '',
    }));
  };

  // Build tasks for preview
  const tasks: GanttTask[] = [];
  const catSet = new Set<string>();
  if (dataset && config.labelColumn && config.startColumn && config.endColumn) {
    for (const row of dataset.rows) {
      const label = String(row[config.labelColumn] ?? '').trim();
      const start = tryParseDate(row[config.startColumn]);
      const end = tryParseDate(row[config.endColumn]);
      const category = config.colorColumn ? String(row[config.colorColumn] ?? '').trim() : '';
      if (label && start && end) {
        const effectiveEnd = end >= start ? end : start;
        tasks.push({ label, start, end: effectiveEnd, category });
        if (category) catSet.add(category);
      }
    }
  }
  const categories = config.colorColumn ? Array.from(catSet) : [];
  const palette = config.colors.length > 0 ? config.colors : paletteColors(theme.palette, theme.customColours);

  const canSave = config.datasetId && config.labelColumn && config.startColumn && config.endColumn;

  const selectClass = 'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#005EB8] bg-white';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Config panel */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Gantt / Timeline</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Dataset */}
          <div>
            <label className={labelClass}>Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No datasets uploaded yet. Open Datasets to add one.</p>
            ) : (
              <select className={selectClass} value={config.datasetId} onChange={(e) => handleDatasetChange(e.target.value)}>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>

          {dataset && (
            <>
              <div>
                <label className={labelClass}>Task / label column</label>
                <select className={selectClass} value={config.labelColumn} onChange={(e) => set('labelColumn', e.target.value)}>
                  <option value="">— select column —</option>
                  {textCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start date</label>
                  <select className={selectClass} value={config.startColumn} onChange={(e) => set('startColumn', e.target.value)}>
                    <option value="">—</option>
                    {dateCols.length > 0
                      ? dateCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                      : allCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className={labelClass}>End date</label>
                  <select className={selectClass} value={config.endColumn} onChange={(e) => set('endColumn', e.target.value)}>
                    <option value="">—</option>
                    {dateCols.length > 0
                      ? dateCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                      : allCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                    }
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Colour by <span className="font-normal text-gray-400">(optional)</span></label>
                <p className="text-xs text-gray-400 mb-1">Category or status column for bar colours</p>
                <select className={selectClass} value={config.colorColumn} onChange={(e) => set('colorColumn', e.target.value)}>
                  <option value="">— none (single colour) —</option>
                  {allCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </>
          )}

          <hr className="border-gray-100" />

          <div>
            <label className={labelClass}>Chart title</label>
            <input
              type="text"
              className={selectClass}
              value={config.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Improvement Programme Timeline"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">Show today line</p>
              <p className="text-xs text-gray-400">Red dashed vertical at current date</p>
            </div>
            <button
              type="button"
              onClick={() => set('showToday', !config.showToday)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${config.showToday ? 'bg-[#005EB8]' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={config.showToday}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${config.showToday ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSave && onSave(config)}
            disabled={!canSave}
            className="flex-1 px-4 py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to dashboard
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          {tasks.length > 0 && (
            <p className="text-xs text-gray-400">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              {categories.length > 0 && ` · ${categories.length} categories`}
            </p>
          )}
        </div>
        <div ref={previewRef} className="flex-1 p-6 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId
                ? 'Select a dataset to preview'
                : !config.labelColumn || !config.startColumn || !config.endColumn
                  ? 'Map label, start date, and end date columns to see the chart'
                  : 'No valid rows found — check date column formats'}
            </div>
          ) : (
            <DashGanttChart
              tasks={tasks}
              categories={categories}
              title={config.title}
              showToday={config.showToday}
              colors={palette}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily="Arial"
            />
          )}
        </div>
      </div>
    </div>
  );
}
