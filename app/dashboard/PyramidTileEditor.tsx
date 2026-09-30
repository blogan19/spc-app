'use client';

import { useState, useRef } from 'react';
import type { PyramidTileConfig, Dataset } from '@/lib/dashboard/types';
import DashPyramidChart, { type PyramidRow } from './charts/DashPyramidChart';
import InlineDataEditor, { buildInlineDataset, type ColSpec } from './InlineDataEditor';
import { newId } from '@/lib/dashboard/seed';

interface Props {
  initialConfig?: PyramidTileConfig;
  datasets: Dataset[];
  onSave: (c: PyramidTileConfig) => void;
  onCancel: () => void;
  onUpsertDataset: (ds: import('@/lib/dashboard/types').Dataset) => void;
}

const DEFAULT: PyramidTileConfig = {
  datasetId: '',
  ageBandColumn: '',
  maleColumn: '',
  femaleColumn: '',
  title: '',
  asPercentage: false,
  maleColor: '#003087',
  femaleColor: '#ae2573',
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
  { key: 'age_band', label: 'Age band', type: 'text' },
  { key: 'male', label: 'Male', type: 'number' },
  { key: 'female', label: 'Female', type: 'number' },
];

export default function PyramidTileEditor({ initialConfig, datasets, onSave, onCancel, onUpsertDataset }: Props) {
  const [local, setLocal] = useState<PyramidTileConfig>(initialConfig ?? DEFAULT);

  const isInline = (initialConfig?.datasetId ?? '').startsWith(INLINE_PREFIX);
  const [dataSource, setDataSource] = useState<'dataset' | 'inline'>(isInline ? 'inline' : 'dataset');
  const inlineId = useRef(isInline ? initialConfig!.datasetId! : INLINE_PREFIX + newId());
  const existingInlineDs = datasets.find((d) => d.id === inlineId.current);
  const [inlineRows, setInlineRows] = useState<Record<string, string>[]>(
    existingInlineDs?.rows?.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    ) ?? []
  );

  const set = (patch: Partial<PyramidTileConfig>) => setLocal((p) => ({ ...p, ...patch }));

  const handleInlineChange = (rows: Record<string, string>[]) => {
    setInlineRows(rows);
    onUpsertDataset(buildInlineDataset(inlineId.current, local.title || 'Inline data', INLINE_COLS, rows));
  };

  const switchToInline = () => {
    const id = inlineId.current;
    setDataSource('inline');
    setLocal((c) => ({ ...c, datasetId: id, ageBandColumn: 'age_band', maleColumn: 'male', femaleColumn: 'female' }));
    onUpsertDataset(buildInlineDataset(id, local.title || 'Inline data', INLINE_COLS, inlineRows));
  };

  const dataset = datasets.find((d) => d.id === local.datasetId);
  const allCols = dataset?.columns.map((c) => c.name) ?? [];
  const numCols = dataset?.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric').map((c) => c.name) ?? [];

  const rows: PyramidRow[] = [];
  if (dataset && local.ageBandColumn && local.maleColumn && local.femaleColumn) {
    for (const row of dataset.rows) {
      const ageBand = String(row[local.ageBandColumn] ?? '').trim();
      const male = Number(row[local.maleColumn]);
      const female = Number(row[local.femaleColumn]);
      if (ageBand && isFinite(male) && isFinite(female)) rows.push({ ageBand, male, female });
    }
  }

  const canSave = dataSource === 'inline' ? inlineRows.length > 0 : !!(local.datasetId && local.ageBandColumn && local.maleColumn && local.femaleColumn);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Config panel */}
      <div className="w-80 flex-none border-r border-gray-200 overflow-y-auto p-4 space-y-4 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Demographic Pyramid</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {field('Title', <input className={INPUT} value={local.title} onChange={(e) => set({ title: e.target.value })} placeholder="Chart title" />)}

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
              <select className={SELECT} value={local.datasetId} onChange={(e) => set({ datasetId: e.target.value, ageBandColumn: '', maleColumn: '', femaleColumn: '' })}>
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
            {field('Age-band column', (
              <select className={SELECT} value={local.ageBandColumn} onChange={(e) => set({ ageBandColumn: e.target.value })}>
                <option value="">— choose —</option>
                {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}

            {field('Male column', (
              <select className={SELECT} value={local.maleColumn} onChange={(e) => set({ maleColumn: e.target.value })}>
                <option value="">— choose —</option>
                {numCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}

            {field('Female column', (
              <select className={SELECT} value={local.femaleColumn} onChange={(e) => set({ femaleColumn: e.target.value })}>
                <option value="">— choose —</option>
                {numCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
          </>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded" checked={local.asPercentage} onChange={(e) => set({ asPercentage: e.target.checked })} />
          <span className="text-xs text-gray-700">Show as % of total population</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {field('Male colour', (
            <input type="color" className="w-full h-8 rounded cursor-pointer border border-gray-300" value={local.maleColor} onChange={(e) => set({ maleColor: e.target.value })} />
          ))}
          {field('Female colour', (
            <input type="color" className="w-full h-8 rounded cursor-pointer border border-gray-300" value={local.femaleColor} onChange={(e) => set({ femaleColor: e.target.value })} />
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" disabled={!canSave} onClick={() => onSave(local)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40">Save</button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
          Preview — {rows.length} age band{rows.length !== 1 ? 's' : ''}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {rows.length > 0 ? (
            <DashPyramidChart
              rows={rows}
              title={local.title}
              asPercentage={local.asPercentage}
              maleColor={local.maleColor}
              femaleColor={local.femaleColor}
              width={480}
              height={320}
              fontFamily="Inter, sans-serif"
            />
          ) : (
            <p className="text-sm text-gray-400">Select a dataset, age-band column, and male/female columns to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
