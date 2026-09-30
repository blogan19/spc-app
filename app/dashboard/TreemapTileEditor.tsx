'use client';

import { useEffect, useRef, useState } from 'react';
import type { TreemapTileConfig, Dataset } from '@/lib/dashboard/types';
import DashTreemapChart, { type TreemapNode } from './charts/DashTreemapChart';
import { paletteColors } from '@/lib/dashboard/seed';

interface TreemapTileEditorProps {
  datasets: Dataset[];
  initialConfig?: TreemapTileConfig;
  onSave: (config: TreemapTileConfig) => void;
  onCancel: () => void;
}

function defaultConfig(datasets: Dataset[]): TreemapTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    labelColumn: '',
    valueColumn: '',
    groupColumn: '',
    title: '',
    colors: [],
  };
}

const INLINE_PREFIX = '__inline_';

export default function TreemapTileEditor({
  datasets,
  initialConfig,
  onSave,
  onCancel,
}: TreemapTileEditorProps) {
  const [config, setConfig] = useState<TreemapTileConfig>(
    initialConfig ?? defaultConfig(datasets)
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setPreviewSize({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof TreemapTileConfig>(k: K, v: TreemapTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const visibleDatasets = datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX));
  const dataset = datasets.find((d) => d.id === config.datasetId);
  const allCols = dataset?.columns ?? [];
  const textCols = allCols.filter((c) => c.type === 'text' || c.type === 'date');
  const numCols = allCols.filter((c) => c.type === 'numeric');

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) {
      set('datasetId', id);
      return;
    }
    const text1 = ds.columns.find((c) => c.type === 'text' || c.type === 'date');
    const num1 = ds.columns.find((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      labelColumn: text1?.name ?? '',
      valueColumn: num1?.name ?? '',
    }));
  };

  const previewColors = paletteColors('nhs', []);

  const previewNodes: TreemapNode[] | null =
    dataset && config.labelColumn && config.valueColumn
      ? dataset.rows
          .map((row) => ({
            label: String(row[config.labelColumn] ?? ''),
            value: Number(row[config.valueColumn]),
            group: config.groupColumn ? String(row[config.groupColumn] ?? '') : undefined,
          }))
          .filter((n) => n.label !== '' && !isNaN(n.value))
      : null;

  const canSave =
    !!config.datasetId && !!config.labelColumn && !!config.valueColumn;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Treemap</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Dataset</label>
            {visibleDatasets.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">No datasets uploaded yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the <strong>Data</strong> button in the toolbar to upload a file.
                </p>
              </div>
            ) : (
              <select
                value={config.datasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— choose dataset —</option>
                {visibleDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Spend by department"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {dataset && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label column</label>
                <select
                  value={config.labelColumn}
                  onChange={(e) => set('labelColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column…</option>
                  {allCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Value column (numeric)
                </label>
                <select
                  value={config.valueColumn}
                  onChange={(e) => set('valueColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column…</option>
                  {numCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Group column (optional)
                </label>
                <select
                  value={config.groupColumn}
                  onChange={(e) => set('groupColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {textCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Groups tiles by colour</p>
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

      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div
          ref={previewRef}
          className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm"
        >
          {previewNodes ? (
            <DashTreemapChart
              data={previewNodes}
              title={config.title}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily="Arial"
              colors={previewColors}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Select columns to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
