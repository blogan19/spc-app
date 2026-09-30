'use client';

import { useEffect, useRef, useState } from 'react';
import type { CalendarHeatmapTileConfig, HeatmapColorScheme, Dataset } from '@/lib/dashboard/types';
import DashCalendarHeatmap, { type CalendarDay } from './charts/DashCalendarHeatmap';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface CalendarHeatmapTileEditorProps {
  datasets: Dataset[];
  initialConfig?: CalendarHeatmapTileConfig;
  onSave: (config: CalendarHeatmapTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

const COLOR_OPTIONS: { value: HeatmapColorScheme; label: string }[] = [
  { value: 'sequential-green', label: 'Green (GitHub-style)' },
  { value: 'sequential-blue', label: 'Blue' },
  { value: 'sequential-orange', label: 'Orange' },
];

const DEFAULT: CalendarHeatmapTileConfig = {
  datasetId: '',
  dateColumn: '',
  valueColumn: '',
  title: '',
  colorScheme: 'sequential-green',
};

const INLINE_PREFIX = '__inline_';
const INLINE_COLS: ColSpec[] = [
  { key: 'date', label: 'Date (YYYY-MM-DD)', type: 'date' },
  { key: 'value', label: 'Value', type: 'number' },
];

function buildCalendarData(
  dataset: Dataset,
  dateCol: string,
  valueCol: string,
): CalendarDay[] {
  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const raw = row[dateCol];
    if (raw == null) continue;
    const d = new Date(String(raw));
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    if (valueCol) {
      const v = Number(row[valueCol]);
      if (!isNaN(v)) map.set(key, (map.get(key) ?? 0) + v);
    } else {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}

export default function CalendarHeatmapTileEditor({
  datasets,
  initialConfig,
  onSave,
  onCancel,
  onUpsertDataset,
}: CalendarHeatmapTileEditorProps) {
  const [config, setConfig] = useState<CalendarHeatmapTileConfig>(
    initialConfig ?? { ...DEFAULT, datasetId: datasets[0]?.id ?? '' },
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 700, h: 180 });
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear());

  const isInline = (initialConfig?.datasetId ?? '').startsWith(INLINE_PREFIX);
  const [dataSource, setDataSource] = useState<'dataset' | 'inline'>(isInline ? 'inline' : 'dataset');
  const inlineId = useRef(isInline ? initialConfig!.datasetId! : INLINE_PREFIX + newId());
  const existingInlineDs = datasets.find((d) => d.id === inlineId.current);
  const [inlineRows, setInlineRows] = useState<Record<string, string>[]>(
    existingInlineDs?.rows?.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    ) ?? []
  );

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setPreviewSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof CalendarHeatmapTileConfig>(k: K, v: CalendarHeatmapTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const handleInlineChange = (rows: Record<string, string>[]) => {
    setInlineRows(rows);
    onUpsertDataset(buildInlineDataset(inlineId.current, config.title || 'Inline data', INLINE_COLS, rows));
  };

  const switchToInline = () => {
    const id = inlineId.current;
    setDataSource('inline');
    setConfig((c) => ({ ...c, datasetId: id, dateColumn: 'date', valueColumn: 'value' }));
    onUpsertDataset(buildInlineDataset(id, config.title || 'Inline data', INLINE_COLS, inlineRows));
  };

  const ds = datasets.find((d) => d.id === config.datasetId);
  const dateCols = ds?.columns.filter((c) => (c.typeOverride ?? c.type) === 'date') ?? [];
  const numCols = ds?.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric') ?? [];

  const previewData = ds && config.dateColumn
    ? buildCalendarData(ds, config.dateColumn, config.valueColumn)
    : [];

  const years = Array.from(
    new Set(previewData.map((d) => new Date(d.date).getFullYear())),
  ).sort((a, b) => b - a);

  const canSave = dataSource === 'inline' ? inlineRows.length > 0 : !!(config.datasetId && config.dateColumn);

  return (
    <div className="fixed inset-0 z-50 flex bg-white">
      {/* Left — config */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Calendar Heatmap</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              value={config.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Daily ED Attendances"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

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
                <select
                  value={config.datasetId}
                  onChange={(e) => set('datasetId', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Select…</option>
                  {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )
            ) : (
              <InlineDataEditor columns={INLINE_COLS} rows={inlineRows} onChange={handleInlineChange} />
            )}
          </div>

          {dataSource === 'dataset' && ds && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date column</label>
                <select
                  value={config.dateColumn}
                  onChange={(e) => set('dateColumn', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Select…</option>
                  {dateCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Value column</label>
                <select
                  value={config.valueColumn}
                  onChange={(e) => set('valueColumn', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Count rows per day</option>
                  {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Leave blank to count occurrences per day.</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Colour scheme</label>
            <div className="space-y-1.5">
              {COLOR_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="colorScheme"
                    value={opt.value}
                    checked={config.colorScheme === opt.value}
                    onChange={() => set('colorScheme', opt.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onSave(config)}
            disabled={!canSave}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-sm transition-colors"
          >
            Add to dashboard
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Right — preview */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          {years.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewYear((y) => y - 1)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
              >
                ←
              </button>
              <span className="text-sm font-semibold text-gray-700">{previewYear}</span>
              <button
                type="button"
                onClick={() => setPreviewYear((y) => y + 1)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 p-6 flex flex-col">
          {config.title && (
            <p className="text-base font-semibold text-gray-900 mb-4">{config.title}</p>
          )}
          <div ref={previewRef} className="flex-1 bg-white rounded-xl border border-gray-200 p-4 overflow-hidden">
            {previewData.length > 0 ? (
              <DashCalendarHeatmap
                data={previewData}
                year={previewYear}
                colorScheme={config.colorScheme}
                width={previewSize.w - 32}
                height={previewSize.h - 32}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {config.dateColumn ? 'No data could be parsed from the selected columns.' : 'Select a date column to see the preview.'}
              </div>
            )}
          </div>
          {previewData.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {previewData.length} days with data across {years.length} year{years.length !== 1 ? 's' : ''}
              {years.length > 1 && ` (${years[years.length - 1]}–${years[0]})`}. Use the arrow buttons to navigate years.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
