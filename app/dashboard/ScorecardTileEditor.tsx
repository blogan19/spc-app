'use client';

import { useState, useEffect, useRef } from 'react';
import type { ScorecardTileConfig, ScorecardRowConfig, Dataset } from '@/lib/dashboard/types';
import DashScorecardChart from './charts/DashScorecardChart';
import TransformLogModal from './TransformLogModal';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface ScorecardTileEditorProps {
  datasets: Dataset[];
  initialConfig?: ScorecardTileConfig;
  onSave: (config: ScorecardTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

const INLINE_PREFIX = '__inline_';
const INLINE_COLS: ColSpec[] = [
  { key: 'metric', label: 'Metric', type: 'text' },
  { key: 'period_1', label: 'Period 1', type: 'number' },
  { key: 'period_2', label: 'Period 2', type: 'number' },
  { key: 'period_3', label: 'Period 3', type: 'number' },
];

function defaultRowConfig(label: string): ScorecardRowConfig {
  return { label, unit: '', higherIsBetter: true, greenThreshold: 95, amberThreshold: 85, decimalPlaces: 1 };
}

function defaultConfig(datasets: Dataset[]): ScorecardTileConfig {
  return { datasetId: datasets[0]?.id ?? '', labelColumn: '', periodColumns: [], title: '', showTrend: true, rowConfigs: [] };
}

export default function ScorecardTileEditor({ datasets, initialConfig, onSave, onCancel, onUpsertDataset }: ScorecardTileEditorProps) {
  const [config, setConfig] = useState<ScorecardTileConfig>(initialConfig ?? defaultConfig(datasets));
  const [showLog, setShowLog] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const isInline = (initialConfig?.datasetId ?? '').startsWith(INLINE_PREFIX);
  const [dataSource, setDataSource] = useState<'dataset' | 'inline'>(isInline ? 'inline' : 'dataset');
  const inlineId = useRef(isInline ? initialConfig!.datasetId! : INLINE_PREFIX + newId());
  const existingInlineDs = datasets.find((d) => d.id === inlineId.current);
  const [inlineRows, setInlineRows] = useState<Record<string, string>[]>(
    existingInlineDs?.rows?.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    ) ?? []
  );

  const set = <K extends keyof ScorecardTileConfig>(k: K, v: ScorecardTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const numCols = dataset?.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric') ?? [];
  const allCols = dataset?.columns ?? [];
  const availablePeriodCols = numCols.filter((c) => c.name !== config.labelColumn);

  // Sync rowConfigs whenever the label column or dataset changes
  useEffect(() => {
    if (!config.datasetId || !config.labelColumn) return;
    const ds = datasets.find((d) => d.id === config.datasetId);
    if (!ds) return;
    const labels = Array.from(
      new Set(ds.rows.map((r) => String(r[config.labelColumn] ?? '').trim()).filter(Boolean))
    );
    setConfig((prev) => {
      const existing = new Map(prev.rowConfigs.map((r) => [r.label, r]));
      const next = labels.map((label) => existing.get(label) ?? defaultRowConfig(label));
      const sameLabels =
        next.length === prev.rowConfigs.length &&
        next.every((r, i) => r.label === prev.rowConfigs[i]?.label);
      return sameLabels ? prev : { ...prev, rowConfigs: next };
    });
  }, [config.datasetId, config.labelColumn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) { set('datasetId', id); return; }
    const textCol = ds.columns.find((c) => (c.typeOverride ?? c.type) === 'text' || (c.typeOverride ?? c.type) === 'date');
    const nums = ds.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      labelColumn: textCol?.name ?? '',
      periodColumns: nums.map((n) => n.name),
      rowConfigs: [],
    }));
  };

  const handleInlineChange = (rows: Record<string, string>[]) => {
    setInlineRows(rows);
    onUpsertDataset(buildInlineDataset(inlineId.current, config.title || 'Inline data', INLINE_COLS, rows));
  };

  const switchToInline = () => {
    const id = inlineId.current;
    setDataSource('inline');
    setConfig((c) => ({ ...c, datasetId: id, labelColumn: 'metric', periodColumns: ['period_1', 'period_2', 'period_3'] }));
    onUpsertDataset(buildInlineDataset(id, config.title || 'Inline data', INLINE_COLS, inlineRows));
  };

  const togglePeriodCol = (name: string) =>
    setConfig((c) => ({
      ...c,
      periodColumns: c.periodColumns.includes(name)
        ? c.periodColumns.filter((n) => n !== name)
        : [...c.periodColumns, name],
    }));

  const updateRowConfig = (label: string, patch: Partial<ScorecardRowConfig>) =>
    setConfig((c) => ({
      ...c,
      rowConfigs: c.rowConfigs.map((r) => (r.label === label ? { ...r, ...patch } : r)),
    }));

  const canSave = dataSource === 'inline'
    ? inlineRows.length > 0
    : !!config.datasetId && !!config.labelColumn && config.periodColumns.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Settings panel */}
      <div className="relative bg-white w-96 flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Scorecard</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                <>
                  <select
                    value={config.datasetId}
                    onChange={(e) => handleDatasetChange(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select dataset…</option>
                    {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {dataset && (
                    <button type="button" onClick={() => setShowLog(true)} className="text-xs text-indigo-600 hover:underline mt-1">
                      View transformations
                    </button>
                  )}
                </>
              )
            ) : (
              <InlineDataEditor columns={INLINE_COLS} rows={inlineRows} onChange={handleInlineChange} />
            )}
          </div>

          {dataSource === 'dataset' && dataset && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metric label column</label>
                <select
                  value={config.labelColumn}
                  onChange={(e) => setConfig((c) => ({ ...c, labelColumn: e.target.value, rowConfigs: [] }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select column…</option>
                  {allCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-0.5">Each unique value becomes a scorecard row</p>
              </div>

              {availablePeriodCols.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">Period columns</label>
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => set('periodColumns', availablePeriodCols.map((c) => c.name))} className="text-indigo-600 hover:underline">All</button>
                      <button type="button" onClick={() => set('periodColumns', [])} className="text-gray-400 hover:underline">None</button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {availablePeriodCols.map((c) => (
                      <label key={c.name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.periodColumns.includes(c.name)}
                          onChange={() => togglePeriodCol(c.name)}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {config.periodColumns.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Select at least one period column</p>
                  )}
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Monthly Performance Scorecard"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showTrend}
              onChange={(e) => set('showTrend', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
            />
            <span className="text-sm text-gray-700">Show trend arrows (▲▼ vs prior period)</span>
          </label>

          {config.rowConfigs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">RAG thresholds per metric</p>
              <div className="space-y-3">
                {config.rowConfigs.map((row) => (
                  <div key={row.label} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-800 truncate" title={row.label}>{row.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Direction</label>
                        <select
                          value={row.higherIsBetter ? 'higher' : 'lower'}
                          onChange={(e) => updateRowConfig(row.label, { higherIsBetter: e.target.value === 'higher' })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="higher">Higher is better</option>
                          <option value="lower">Lower is better</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Unit suffix</label>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => updateRowConfig(row.label, { unit: e.target.value })}
                          placeholder="%"
                          maxLength={8}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Green {row.higherIsBetter ? '≥' : '≤'}
                        </label>
                        <input
                          type="number"
                          value={row.greenThreshold}
                          onChange={(e) => updateRowConfig(row.label, { greenThreshold: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          Amber {row.higherIsBetter ? '≥' : '≤'}
                        </label>
                        <input
                          type="number"
                          value={row.amberThreshold}
                          onChange={(e) => updateRowConfig(row.label, { amberThreshold: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Decimals</label>
                        <select
                          value={row.decimalPlaces}
                          onChange={(e) => updateRowConfig(row.label, { decimalPlaces: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value={0}>0</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

      {/* Preview */}
      <div className="relative flex-1 flex flex-col bg-gray-100 overflow-hidden z-10">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
        </div>
        <div ref={previewRef} className="flex-1 min-h-0 overflow-hidden bg-white m-6 rounded-2xl shadow-sm">
          {dataset && config.labelColumn && config.periodColumns.length > 0 ? (
            <DashScorecardChart dataset={dataset} config={config} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId
                ? 'Select a dataset'
                : !config.labelColumn
                  ? 'Select a label column'
                  : 'Select period columns to preview'}
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
