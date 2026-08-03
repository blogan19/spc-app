'use client';

import { useState } from 'react';
import type { PyramidTileConfig, Dataset } from '@/lib/dashboard/types';
import DashPyramidChart, { type PyramidRow } from './charts/DashPyramidChart';

interface Props {
  initialConfig?: PyramidTileConfig;
  datasets: Dataset[];
  onSave: (c: PyramidTileConfig) => void;
  onCancel: () => void;
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

export default function PyramidTileEditor({ initialConfig, datasets, onSave, onCancel }: Props) {
  const [local, setLocal] = useState<PyramidTileConfig>(initialConfig ?? DEFAULT);

  const set = (patch: Partial<PyramidTileConfig>) => setLocal((p) => ({ ...p, ...patch }));

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

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Config panel */}
      <div className="w-80 flex-none border-r border-gray-200 overflow-y-auto p-4 space-y-4 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Demographic Pyramid</h3>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {field('Title', <input className={INPUT} value={local.title} onChange={(e) => set({ title: e.target.value })} placeholder="Chart title" />)}

        {field('Dataset', (
          <select className={SELECT} value={local.datasetId} onChange={(e) => set({ datasetId: e.target.value, ageBandColumn: '', maleColumn: '', femaleColumn: '' })}>
            <option value="">— choose —</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ))}

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
          <button type="button" onClick={() => onSave(local)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#005EB8] text-white font-medium hover:bg-[#003087]">Save</button>
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
