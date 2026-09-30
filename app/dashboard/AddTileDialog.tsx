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

const TILE_GROUPS: { label: string; tiles: { kind: TileKind; icon: string; name: string; description: string }[] }[] = [
  {
    label: 'Headlines',
    tiles: [
      { kind: 'kpi', icon: '🔢', name: 'KPI', description: 'Single highlighted metric with target and trend' },
      { kind: 'gauge', icon: '⏱️', name: 'Gauge', description: 'Speedometer-style dial with RAG colour zones' },
      { kind: 'text', icon: '📝', name: 'Text', description: 'Free-form notes, labels, or instructions' },
      { kind: 'image', icon: '🖼️', name: 'Image', description: 'Embed a static image or photo' },
      { kind: 'title', icon: '🏷️', name: 'Title', description: 'Large heading to divide the dashboard' },
      { kind: 'section', icon: '⬜', name: 'Section', description: 'Coloured box divider with optional label' },
      { kind: 'divider', icon: '—', name: 'Divider', description: 'Thin horizontal rule to separate sections' },
    ],
  },
  {
    label: 'Time series',
    tiles: [
      { kind: 'spc', icon: '📈', name: 'SPC Chart', description: 'Statistical Process Control — identify special cause variation over time' },
      { kind: 'run', icon: '〰️', name: 'Run Chart', description: 'Run chart with median line and basic variation rules' },
      { kind: 'line', icon: '📉', name: 'Line Chart', description: 'One or more time-series lines from a dataset' },
      { kind: 'area', icon: '🏔️', name: 'Area Chart', description: 'Filled area chart for cumulative or proportional trends' },
    ],
  },
  {
    label: 'Comparisons',
    tiles: [
      { kind: 'bar', icon: '📊', name: 'Bar Chart', description: 'Compare values across categories — vertical or horizontal' },
      { kind: 'pareto', icon: '🎯', name: 'Pareto', description: 'Bar + cumulative % line for root cause analysis (80/20 rule)' },
      { kind: 'pie', icon: '🥧', name: 'Pie / Donut', description: 'Part-to-whole breakdown using segments' },
      { kind: 'funnel', icon: '🏥', name: 'Funnel Plot', description: 'Funnel chart for sequential stages or process rates' },
      { kind: 'waterfall', icon: '🌊', name: 'Waterfall', description: 'How sequential positive and negative values accumulate to a total' },
      { kind: 'sankey', icon: '🔀', name: 'Sankey', description: 'Flow diagram showing how values move between categories' },
    ],
  },
  {
    label: 'Distribution',
    tiles: [
      { kind: 'scatter', icon: '⚬', name: 'Scatter', description: 'Plot two variables to explore correlation' },
      { kind: 'boxplot', icon: '📦', name: 'Box Plot', description: 'Distribution spread, quartiles, and outliers' },
      { kind: 'pyramid', icon: '🔺', name: 'Pyramid', description: 'Two-sided comparison e.g. age bands, male/female' },
      { kind: 'heatmap', icon: '🌡️', name: 'Heatmap', description: 'Matrix of colour-coded values for cross-tabulated data' },
      { kind: 'calendar', icon: '📅', name: 'Calendar', description: 'Daily values shown on a calendar grid' },
      { kind: 'treemap', icon: '🗂️', name: 'Treemap', description: 'Sized rectangles showing part-to-whole with optional grouping' },
    ],
  },
  {
    label: 'Planning',
    tiles: [
      { kind: 'gantt', icon: '🗓️', name: 'Timeline', description: 'Project timeline and task scheduling' },
      { kind: 'table', icon: '📋', name: 'Data Table', description: 'Tabular data with optional sorting' },
      { kind: 'scorecard', icon: '✅', name: 'Scorecard', description: 'RAG-rated metrics table with targets and thresholds' },
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
        className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-700"
      >
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {suggestion && (
        <button
          type="button"
          onClick={() => onSelect(suggestion.kind)}
          className="mt-2.5 w-full flex items-center gap-2.5 p-2.5 bg-white border border-indigo-500/30 rounded-lg hover:bg-indigo-50 transition-colors text-left"
        >
          <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-600">Use {suggestion.title}</p>
            <p className="text-xs text-slate-500 truncate">{suggestion.reason}</p>
          </div>
          <span className="text-indigo-600 text-sm flex-shrink-0">→</span>
        </button>
      )}
    </div>
  );
}

export default function AddTileDialog({ onSelect, onClose, onChoose, datasets }: AddTileDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
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
              className="w-full flex items-center gap-3 px-3.5 py-3 mb-5 rounded-xl border border-dashed border-indigo-500/40
                         hover:bg-indigo-50 hover:border-indigo-400 transition-all group text-left"
            >
              <span className="text-lg flex-shrink-0">🧭</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-600">Help me choose</p>
                <p className="text-xs text-slate-500">Answer a few questions</p>
              </div>
              <span className="text-indigo-600/40 group-hover:text-indigo-600 transition-colors">→</span>
            </button>
          )}

          {/* Grouped list */}
          <div className="space-y-5">
            {TILE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
                <div className="grid grid-cols-2 gap-1">
                  {group.tiles.map((tile) => (
                    <button
                      key={tile.kind}
                      type="button"
                      onClick={() => onSelect(tile.kind)}
                      className="flex flex-col px-3 py-2.5 rounded-lg border border-transparent
                                 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                    >
                      <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 leading-tight">{tile.name}</p>
                      <p className="text-xs text-slate-400 leading-snug mt-0.5">{tile.description}</p>
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
