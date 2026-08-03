'use client';

import { useState } from 'react';
import type { Dataset, TileKind } from '@/lib/dashboard/types';
import { suggestChartType } from '@/lib/dashboard/suggestChart';

interface AddTileDialogProps {
  onSelect: (kind: TileKind) => void;
  onClose: () => void;
  onChoose?: () => void;
  datasets?: Dataset[];
}

const TILE_GROUPS: { label: string; tiles: { kind: TileKind; icon: string; name: string }[] }[] = [
  {
    label: 'Headlines',
    tiles: [
      { kind: 'kpi', icon: '🔢', name: 'KPI' },
      { kind: 'text', icon: '📝', name: 'Text' },
      { kind: 'image', icon: '🖼️', name: 'Image' },
      { kind: 'title', icon: '🏷️', name: 'Title' },
      { kind: 'section', icon: '⬜', name: 'Section' },
    ],
  },
  {
    label: 'Time series',
    tiles: [
      { kind: 'spc', icon: '📈', name: 'SPC Chart' },
      { kind: 'run', icon: '〰️', name: 'Run Chart' },
      { kind: 'line', icon: '📉', name: 'Line Chart' },
      { kind: 'area', icon: '🏔️', name: 'Area Chart' },
    ],
  },
  {
    label: 'Comparisons',
    tiles: [
      { kind: 'bar', icon: '📊', name: 'Bar Chart' },
      { kind: 'pareto', icon: '🎯', name: 'Pareto' },
      { kind: 'pie', icon: '🥧', name: 'Pie / Donut' },
      { kind: 'funnel', icon: '🏥', name: 'Funnel Plot' },
      { kind: 'waterfall', icon: '🌊', name: 'Waterfall' },
    ],
  },
  {
    label: 'Distribution',
    tiles: [
      { kind: 'scatter', icon: '⚬', name: 'Scatter' },
      { kind: 'boxplot', icon: '📦', name: 'Box Plot' },
      { kind: 'pyramid', icon: '🔺', name: 'Pyramid' },
      { kind: 'heatmap', icon: '🌡️', name: 'Heatmap' },
      { kind: 'calendar', icon: '📅', name: 'Calendar' },
    ],
  },
  {
    label: 'Planning',
    tiles: [
      { kind: 'gantt', icon: '🗓️', name: 'Timeline' },
      { kind: 'table', icon: '📋', name: 'Data Table' },
      { kind: 'scorecard', icon: '✅', name: 'Scorecard' },
    ],
  },
];

function SuggestBanner({ datasets, onSelect }: { datasets: Dataset[]; onSelect: (kind: TileKind) => void }) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const ds = datasets.find((d) => d.id === datasetId);
  const suggestion = ds ? suggestChartType(ds.columns) : null;

  if (datasets.length === 0) return null;

  return (
    <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
      <p className="text-xs font-semibold text-slate-600 mb-2">Suggest from my data</p>
      <select
        value={datasetId}
        onChange={(e) => setDatasetId(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#005EB8]/30 text-slate-700"
      >
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {suggestion && (
        <button
          type="button"
          onClick={() => onSelect(suggestion.kind)}
          className="mt-2.5 w-full flex items-center gap-2.5 p-2.5 bg-white border border-[#005EB8]/30 rounded-lg hover:bg-blue-50 transition-colors text-left"
        >
          <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#005EB8]">Use {suggestion.title}</p>
            <p className="text-xs text-slate-500 truncate">{suggestion.reason}</p>
          </div>
          <span className="text-[#005EB8] text-sm flex-shrink-0">→</span>
        </button>
      )}
    </div>
  );
}

export default function AddTileDialog({ onSelect, onClose, onChoose, datasets }: AddTileDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">Add a tile</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Suggest from data */}
          {datasets && datasets.length > 0 && (
            <SuggestBanner datasets={datasets} onSelect={onSelect} />
          )}

          {/* Wizard */}
          {onChoose && (
            <button
              type="button"
              onClick={onChoose}
              className="w-full flex items-center gap-3 px-3.5 py-3 mb-4 rounded-xl border border-dashed border-[#005EB8]/40
                         hover:bg-blue-50 hover:border-[#005EB8] transition-all group text-left"
            >
              <span className="text-lg flex-shrink-0">🧭</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#005EB8]">Help me choose</p>
                <p className="text-xs text-slate-500">Answer a few questions</p>
              </div>
              <span className="text-[#005EB8]/40 group-hover:text-[#005EB8] transition-colors">→</span>
            </button>
          )}

          {/* Grouped grid */}
          <div className="space-y-4">
            {TILE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.tiles.map((tile) => (
                    <button
                      key={tile.kind}
                      type="button"
                      onClick={() => onSelect(tile.kind)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200
                                 hover:border-[#005EB8] hover:bg-blue-50 transition-all group text-center"
                    >
                      <span className="text-xl">{tile.icon}</span>
                      <span className="text-xs font-medium text-slate-700 group-hover:text-[#005EB8] leading-tight">{tile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
