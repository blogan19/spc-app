'use client';

import { useEffect, useRef, useState } from 'react';
import type { FunnelTileConfig, Dataset } from '@/lib/dashboard/types';
import { analyseFunnel, type FunnelInputUnit } from '@/lib/spc/funnel';
import DashFunnelChart from './charts/DashFunnelChart';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface FunnelTileEditorProps {
  datasets: Dataset[];
  initialConfig?: FunnelTileConfig;
  onSave: (config: FunnelTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

function defaultConfig(datasets: Dataset[]): FunnelTileConfig {
  return {
    datasetId: datasets[0]?.id ?? '',
    nameColumn: '',
    numeratorColumn: '',
    denominatorColumn: '',
    title: '',
    yLabel: '',
    asPercentage: true,
    color: '#005EB8',
  };
}

export default function FunnelTileEditor({
  datasets,
  initialConfig,
  onSave,
  onCancel,
  onUpsertDataset,
}: FunnelTileEditorProps) {
  const [config, setConfig] = useState<FunnelTileConfig>(initialConfig ?? defaultConfig(datasets));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 320 });

  const INLINE_PREFIX = '__inline_';
  const INLINE_COLS: ColSpec[] = [
    { key: 'unit', label: 'Unit/Ward', type: 'text' },
    { key: 'numerator', label: 'Numerator', type: 'number' },
    { key: 'denominator', label: 'Denominator', type: 'number' },
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
    setConfig((c) => ({ ...c, datasetId: id, nameColumn: 'unit', numeratorColumn: 'numerator', denominatorColumn: 'denominator' }));
    onUpsertDataset(buildInlineDataset(id, config.title || 'Inline data', INLINE_COLS, inlineRows));
  };

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

  const set = <K extends keyof FunnelTileConfig>(k: K, v: FunnelTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const dataset = datasets.find((d) => d.id === config.datasetId);
  const numCols = dataset?.columns.filter((c) => c.type === 'numeric') ?? [];
  const allCols = dataset?.columns ?? [];

  const handleDatasetChange = (id: string) => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) return;
    const txtCols = ds.columns.filter((c) => c.type === 'text' || c.type === 'date');
    const nCols = ds.columns.filter((c) => c.type === 'numeric');
    setConfig((c) => ({
      ...c,
      datasetId: id,
      nameColumn: txtCols[0]?.name ?? '',
      numeratorColumn: nCols[0]?.name ?? '',
      denominatorColumn: nCols[1]?.name ?? nCols[0]?.name ?? '',
    }));
  };

  // Build analysis for preview
  const inputUnits: FunnelInputUnit[] = [];
  if (dataset && config.nameColumn && config.numeratorColumn && config.denominatorColumn) {
    for (const row of dataset.rows) {
      const name = String(row[config.nameColumn] ?? '').trim();
      const num = Number(row[config.numeratorColumn]);
      const den = Number(row[config.denominatorColumn]);
      if (name && isFinite(num) && isFinite(den) && den > 0) {
        inputUnits.push({ name, numerator: num, denominator: den });
      }
    }
  }
  const analysis = inputUnits.length >= 2 ? analyseFunnel(inputUnits) : null;

  const canSave = dataSource === 'inline'
    ? inlineRows.length > 0
    : !!(config.datasetId &&
      config.nameColumn &&
      config.numeratorColumn &&
      config.denominatorColumn);

  const selectClass =
    'w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Config panel */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Funnel Plot</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Data source */}
          <div>
            <label className={labelClass}>Data source</label>
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
                <select className={selectClass} value={config.datasetId} onChange={(e) => handleDatasetChange(e.target.value)}>
                  <option value="">— choose dataset —</option>
                  {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )
            ) : (
              <InlineDataEditor columns={INLINE_COLS} rows={inlineRows} onChange={handleInlineChange} />
            )}
          </div>

          {/* Chart title */}
          <div>
            <label className={labelClass}>Chart title</label>
            <input
              type="text"
              className={selectClass}
              value={config.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. 4-hour standard compliance by site"
            />
          </div>

          {/* Column mapping */}
          {dataSource === 'dataset' && dataset && (
            <>
              <div>
                <label className={labelClass}>Unit name column</label>
                <p className="text-xs text-gray-400 mb-1">The ward, trust, or unit label for each row</p>
                <select className={selectClass} value={config.nameColumn} onChange={(e) => set('nameColumn', e.target.value)}>
                  <option value="">— select column —</option>
                  {allCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Numerator column</label>
                <p className="text-xs text-gray-400 mb-1">Events or patients meeting the standard</p>
                <select className={selectClass} value={config.numeratorColumn} onChange={(e) => set('numeratorColumn', e.target.value)}>
                  <option value="">— select column —</option>
                  {numCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Denominator column</label>
                <p className="text-xs text-gray-400 mb-1">Total population / volume for each unit</p>
                <select className={selectClass} value={config.denominatorColumn} onChange={(e) => set('denominatorColumn', e.target.value)}>
                  <option value="">— select column —</option>
                  {numCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <hr className="border-gray-100" />

          <div>
            <label className={labelClass}>Y-axis label</label>
            <input
              type="text"
              className={selectClass}
              value={config.yLabel}
              onChange={(e) => set('yLabel', e.target.value)}
              placeholder="e.g. % patients meeting standard"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">Show as percentage</p>
              <p className="text-xs text-gray-400">Display y-axis as 0–100% rather than 0–1</p>
            </div>
            <button
              type="button"
              onClick={() => set('asPercentage', !config.asPercentage)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${config.asPercentage ? 'bg-indigo-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={config.asPercentage}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${config.asPercentage ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div>
            <label className={labelClass}>Dot colour (within limits)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-8 w-12 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-xs text-gray-500">{config.color}</span>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">How funnel plots work</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Each unit is plotted at its denominator (volume) and rate. The funnel shows the expected range of natural variation — units outside the funnel are statistical outliers, labelled in red (above) or green (below).
            </p>
          </div>
        </div>

        {/* Footer */}
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
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to dashboard
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">Preview</p>
          {analysis && (
            <p className="text-xs text-gray-400">
              {analysis.units.length} units · {analysis.units.filter((u) => u.signal !== null).length} outlier{analysis.units.filter((u) => u.signal !== null).length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div ref={previewRef} className="flex-1 p-6 overflow-hidden">
          {!analysis ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {!config.datasetId
                ? 'Select a dataset to preview'
                : !config.nameColumn || !config.numeratorColumn || !config.denominatorColumn
                  ? 'Map all three columns to see the funnel'
                  : 'Not enough valid rows to draw a funnel (need ≥ 2 units)'}
            </div>
          ) : (
            <DashFunnelChart
              analysis={analysis}
              title={config.title}
              yLabel={config.yLabel}
              asPercentage={config.asPercentage}
              color={config.color}
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
