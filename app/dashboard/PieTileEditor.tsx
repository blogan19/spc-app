'use client';

import { useEffect, useRef, useState } from 'react';
import type { PieTileConfig, PieLabelKind, Dataset, DashboardTheme } from '@/lib/dashboard/types';
import { paletteColors } from '@/lib/dashboard/seed';
import DashPieChart from './charts/DashPieChart';
import TransformLogModal from './TransformLogModal';

interface PieTileEditorProps {
  datasets: Dataset[];
  theme: DashboardTheme;
  initialConfig?: PieTileConfig;
  onSave: (config: PieTileConfig) => void;
  onCancel: () => void;
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

export default function PieTileEditor({ datasets, theme, initialConfig, onSave, onCancel }: PieTileEditorProps) {
  const palette = paletteColors(theme.palette, theme.customColours);
  const [config, setConfig] = useState<PieTileConfig>(initialConfig ?? defaultConfig(datasets, palette));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });
  const [showLog, setShowLog] = useState(false);

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

  const canSave = !!config.datasetId && !!config.categoryColumn;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      <div className="relative bg-white w-80 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Pie / Donut chart</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {datasets.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">No datasets yet.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dataset</label>
                <select value={config.datasetId} onChange={(e) => handleDatasetChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select dataset…</option>
                  {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {dataset && <button type="button" onClick={() => setShowLog(true)} className="text-xs text-[#005EB8] hover:underline mt-1">View transformations</button>}
              </div>

              {dataset && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category column</label>
                    <select value={config.categoryColumn} onChange={(e) => set('categoryColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Select column…</option>
                      {[...textCols, ...numCols].map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Value column <span className="font-normal text-gray-400">(optional — blank = count)</span>
                    </label>
                    <select value={config.valueColumn} onChange={(e) => set('valueColumn', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chart title</label>
                <input type="text" value={config.title} onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Complaints by type"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>

              {/* Inner radius — pie vs donut */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Style: {config.innerRadius === 0 ? 'Pie' : `Donut (${Math.round(config.innerRadius * 100)}% hole)`}
                </label>
                <input type="range" min={0} max={0.65} step={0.05} value={config.innerRadius}
                  onChange={(e) => set('innerRadius', Number(e.target.value))}
                  className="w-full accent-[#005EB8]" />
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
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${config.labelKind === o.value ? 'border-[#005EB8] bg-blue-50 text-[#005EB8] font-medium' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other threshold */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Group small slices into &ldquo;Other&rdquo; — below{' '}
                  <span className="text-[#005EB8]">{config.otherThreshold}%</span>
                  {config.otherThreshold === 0 && ' (off)'}
                </label>
                <input type="range" min={0} max={20} step={1} value={config.otherThreshold}
                  onChange={(e) => set('otherThreshold', Number(e.target.value))}
                  className="w-full accent-[#005EB8]" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Off</span><span>20%</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button" disabled={!canSave} onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
