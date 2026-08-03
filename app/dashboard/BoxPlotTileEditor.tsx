'use client';

import { useState } from 'react';
import type { BoxPlotTileConfig, Dataset } from '@/lib/dashboard/types';
import DashBoxPlotChart, { type BoxGroup } from './charts/DashBoxPlotChart';

interface Props {
  initialConfig?: BoxPlotTileConfig;
  datasets: Dataset[];
  onSave: (c: BoxPlotTileConfig) => void;
  onCancel: () => void;
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

export default function BoxPlotTileEditor({ initialConfig, datasets, onSave, onCancel }: Props) {
  const [local, setLocal] = useState<BoxPlotTileConfig>(initialConfig ?? DEFAULT);

  const set = (patch: Partial<BoxPlotTileConfig>) => setLocal((p) => ({ ...p, ...patch }));

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

        {field('Dataset', (
          <select className={SELECT} value={local.datasetId} onChange={(e) => set({ datasetId: e.target.value, valueColumn: '', groupColumn: '' })}>
            <option value="">— choose —</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ))}

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

        {field('Box colour', (
          <input type="color" className="w-full h-8 rounded cursor-pointer border border-gray-300" value={local.color} onChange={(e) => set({ color: e.target.value })} />
        ))}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded" checked={local.showOutliers} onChange={(e) => set({ showOutliers: e.target.checked })} />
          <span className="text-xs text-gray-700">Show outliers (beyond 1.5× IQR)</span>
        </label>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-medium">How to read a box plot</p>
          <p>The box spans Q1–Q3. The line is the median. Whiskers extend to the most extreme non-outlier value. Each group needs ≥ 4 values.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => onSave(local)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#005EB8] text-white font-medium hover:bg-[#003087]">Save</button>
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
