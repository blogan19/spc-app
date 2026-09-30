'use client';

import { useEffect, useRef, useState } from 'react';
import type { SankeyTileConfig, Dataset } from '@/lib/dashboard/types';
import DashSankeyChart, { type SankeyLink } from './charts/DashSankeyChart';
import { paletteColors } from '@/lib/dashboard/seed';

interface SankeyTileEditorProps {
  datasets: Dataset[];
  initialConfig?: SankeyTileConfig;
  onSave: (config: SankeyTileConfig) => void;
  onCancel: () => void;
}

function defaultConfig(datasets: Dataset[]): SankeyTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    sourceColumn: '',
    targetColumn: '',
    valueColumn: '',
    title: '',
    colors: [],
  };
}

function buildSankeyLinks(
  dataset: Dataset,
  sourceCol: string,
  targetCol: string,
  valueCol: string,
): SankeyLink[] {
  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const src = String(row[sourceCol] ?? '').trim();
    const tgt = String(row[targetCol] ?? '').trim();
    if (!src || !tgt) continue;
    const key = `${src}\0${tgt}`;
    if (valueCol) {
      const v = Number(row[valueCol]);
      if (!isNaN(v)) {
        map.set(key, (map.get(key) ?? 0) + v);
      }
    } else {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  const result: SankeyLink[] = [];
  for (const [key, value] of map) {
    if (value <= 0) continue;
    const sep = key.indexOf('\0');
    result.push({ source: key.slice(0, sep), target: key.slice(sep + 1), value });
  }
  return result;
}

export default function SankeyTileEditor({ datasets, initialConfig, onSave, onCancel }: SankeyTileEditorProps) {
  const [config, setConfig] = useState<SankeyTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });

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

  const set = <K extends keyof SankeyTileConfig>(k: K, v: SankeyTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const publicDatasets = datasets.filter((d) => !d.id.startsWith('__inline_'));
  const dataset = datasets.find((d) => d.id === config.datasetId);
  const allCols = dataset?.columns ?? [];
  const numCols = dataset?.columns.filter((c) => c.type === 'numeric') ?? [];

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const cols = ds.columns;
    const textCols = cols.filter((c) => c.type === 'text' || c.type === 'date');
    const numCol = cols.find((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      sourceColumn: textCols[0]?.name ?? '',
      targetColumn: textCols[1]?.name ?? '',
      valueColumn: numCol?.name ?? '',
    }));
  };

  const ready = !!dataset && !!config.sourceColumn && !!config.targetColumn;
  const links = ready
    ? buildSankeyLinks(dataset, config.sourceColumn, config.targetColumn, config.valueColumn)
    : null;

  const canSave = !!config.datasetId && !!config.sourceColumn && !!config.targetColumn;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Sankey</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Dataset</label>
            {publicDatasets.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">No datasets uploaded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Use the <strong>Data</strong> button in the toolbar to upload a file.</p>
              </div>
            ) : (
              <select
                value={config.datasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— choose dataset —</option>
                {publicDatasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
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
              placeholder="e.g. Patient pathway flows"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {dataset && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Source column</label>
                <select
                  value={config.sourceColumn}
                  onChange={(e) => set('sourceColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column…</option>
                  {allCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target column</label>
                <select
                  value={config.targetColumn}
                  onChange={(e) => set('targetColumn', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column…</option>
                  {allCols.map((c) => (
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
                  <option value="">— Count rows —</option>
                  {numCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Leave blank to count rows per source–target pair</p>
              </div>
            </>
          )}
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

      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div ref={previewRef} className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm">
          {links ? (
            <DashSankeyChart
              links={links}
              title={config.title}
              width={previewSize.w}
              height={previewSize.h}
              fontFamily="Arial"
              colors={paletteColors('nhs', [])}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Select source and target columns to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
