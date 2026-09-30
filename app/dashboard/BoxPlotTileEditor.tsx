'use client';

import { useState, useRef } from 'react';
import type { BoxPlotTileConfig, Dataset } from '@/lib/dashboard/types';
import DashBoxPlotChart, { type BoxGroup } from './charts/DashBoxPlotChart';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface Props {
  initialConfig?: BoxPlotTileConfig;
  datasets: Dataset[];
  onSave: (c: BoxPlotTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

const DEFAULT: BoxPlotTileConfig = {
  datasetId: '',
  valueColumn: '',
  groupColumn: '',
  title: '',
  yLabel: '',
  showOutliers: true,
  color: '#005EB8',
};

function field(label: string, children: React.ReactNode) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

const SELECT = 'w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500';
const INPUT = 'w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500';

const INLINE_PREFIX = '__inline_';
const INLINE_COLS: ColSpec[] = [
  { key: 'group', label: 'Group', type: 'text' },
  { key: 'value', label: 'Value', type: 'number' },
];

export default function BoxPlotTileEditor({ initialConfig, datasets, onSave, onCancel, onUpsertDataset }: Props) {
  const [local, setLocal] = useState<BoxPlotTileConfig>(initialConfig ?? DEFAULT);

  const isInline = (initialConfig?.datasetId ?? '').startsWith(INLINE_PREFIX);
  const [dataSource, setDataSource] = useState<'dataset' | 'inline'>(isInline ? 'inline' : 'dataset');
  const inlineId = useRef(isInline ? initialConfig!.datasetId! : INLINE_PREFIX + newId());
  const existingInlineDs = datasets.find((d) => d.id === inlineId.current);
  const [inlineRows, setInlineRows] = useState<Record<string, string>[]>(
    existingInlineDs?.rows?.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    ) ?? []
  );

  const set = (patch: Partial<BoxPlotTileConfig>) => setLocal((p) => ({ ...p, ...patch }));

  const handleInlineChange = (rows: Record<string, string>[]) => {
    setInlineRows(rows);
    onUpsertDataset(buildInlineDataset(inlineId.current, local.title || 'Inline data', INLINE_COLS, rows));
  };

  const switchToInline = () => {
    const id = inlineId.current;
    setDataSource('inline');
    setLocal((c) => ({ ...c, datasetId: id, valueColumn: 'value', groupColumn: 'group' }));
    onUpsertDataset(buildInlineDataset(id, local.title || 'Inline data', INLINE_COLS, inlineRows));
  };

  const dataset = datasets.find((d) => d.id === local.datasetId);
  const allCols = dataset?.columns.map((c) => c.name) ?? [];
  const numCols = dataset?.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric').map((c) => c.name) ?? [];

  const groups: BoxGroup[] = [];
  if (dataset && local.valueColumn) {
    if (local.groupColumn) {
      const map = new Map<string, number[]>();
      for (const row of dataset.rows) {
        const grp = String(row[local.groupColumn] ?? '').trim();
        const val = Number(row[local.valueColumn]);
        if (grp && isFinite(val)) {
          if (!map.has(grp)) map.set(grp, []);
          map.get(grp)!.push(val);
        }
      }
      for (const [label, values] of map) {
        if (values.length >= 4) groups.push({ label, values });
      }
    } else {
      const values = dataset.rows.map((r) => Number(r[local.valueColumn])).filter(isFinite);
      if (values.length >= 4) groups.push({ label: local.valueColumn, values });
    }
  }

  const canSave = dataSource === 'inline' ? inlineRows.length > 0 : !!(local.datasetId && local.valueColumn);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Config panel */}
      <div className="w-80 flex-none border-r border-gray-200 overflow-y-auto p-4 space-y-4 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Box Plot</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {field('Title', <input className={INPUT} value={local.title} onChange={(e) => set({ title: e.target.value })} placeholder="Chart title" />)}
        {field('Y-axis label', <input className={INPUT} value={local.yLabel} onChange={(e) => set({ yLabel: e.target.value })} placeholder="e.g. Length of stay (days)" />)}

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
              <select className={SELECT} value={local.datasetId} onChange={(e) => set({ datasetId: e.target.value, valueColumn: '', groupColumn: '' })}>
                <option value="">— choose —</option>
                {datasets.filter((d) => !d.id.startsWith(INLINE_PREFIX)).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )
          ) : (
            <InlineDataEditor columns={INLINE_COLS} rows={inlineRows} onChange={handleInlineChange} />
          )}
        </div>

        {dataSource === 'dataset' && dataset && (
          <>
            {field('Value column', (
              <select className={SELECT} value={local.valueColumn} onChange={(e) => set({ valueColumn: e.target.value })}>
                <option value="">— choose —</option>
                {numCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}

            {field('Group by column (optional)', (
              <select className={SELECT} value={local.groupColumn} onChange={(e) => set({ groupColumn: e.target.value })}>
                <option value="">— single box —</option>
                {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
          </>
        )}

        {field('Box colour', (
          <input type="color" className="w-full h-8 rounded cursor-pointer border border-gray-300" value={local.color} onChange={(e) => set({ color: e.target.value })} />
        ))}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded" checked={local.showOutliers} onChange={(e) => set({ showOutliers: e.target.checked })} />
          <span className="text-xs text-gray-700">Show outliers (beyond 1.5× IQR)</span>
        </label>

        <div className="rounded-lg bg-indigo-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-medium">How to read a box plot</p>
          <p>The box spans Q1–Q3. The line is the median. Whiskers extend to the most extreme non-outlier value. Each group needs ≥ 4 values.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" disabled={!canSave} onClick={() => onSave(local)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40">Save</button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
          Preview — {groups.length} group{groups.length !== 1 ? 's' : ''}
          {groups.length > 0 && ` (${groups.reduce((s, g) => s + g.values.length, 0)} values)`}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {groups.length > 0 ? (
            <DashBoxPlotChart
              groups={groups}
              title={local.title}
              yLabel={local.yLabel}
              showOutliers={local.showOutliers}
              color={local.color}
              width={480}
              height={300}
              fontFamily="Inter, sans-serif"
            />
          ) : (
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Select a dataset and value column. Each group needs at least 4 values.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
