'use client';

import { useMemo, useState } from 'react';
import type { DashboardState } from '@/lib/dashboard/types';
import type { ExampleDef } from '@/lib/dashboard/examples';
import TileGrid from './TileGrid';

interface Props {
  example: ExampleDef;
  onUse: (state: DashboardState) => void;
  onClose: () => void;
}

export default function ExampleViewer({ example, onUse, onClose }: Props) {
  const [showGuide, setShowGuide] = useState(true);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const state = useMemo(() => example.build(), [example]);

  const guideItems = example.guide.map((item) => {
    const chart = state.charts.find((c) => c.name === item.chartName);
    return { ...item, chartType: chart?.type ?? null };
  });

  const handleUse = () => {
    const copy: DashboardState = {
      ...state,
      dashboard: {
        ...state.dashboard,
        title: `${state.dashboard.title} (copy)`,
      },
    };
    onUse(copy);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">

      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center gap-4 flex-shrink-0 z-10">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded flex-shrink-0 flex items-center gap-1 text-sm"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Examples
        </button>
        <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
        <span className="text-sm font-semibold text-slate-800 flex-1 truncate">
          {example.icon} {example.name}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              showGuide
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z"/>
            </svg>
            {showGuide ? 'Hide guide' : 'Show guide'}
          </button>
          <button
            type="button"
            onClick={handleUse}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-[#005EB8] text-white hover:bg-[#004da0] transition-colors"
          >
            Use as starting point
          </button>
        </div>
      </header>

      {/* Synthetic data banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-amber-700 font-medium">Synthetic data only</span>
        <span className="text-xs text-amber-600">
          — This dashboard uses realistic but fictional NHS figures for demonstration. Click "Use as starting point" to copy it and replace the data with your own.
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Dashboard */}
        <div className="flex-1 overflow-auto p-4">
          {state.dashboard.tiles.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              No tiles in this example.
            </div>
          ) : (
            <TileGrid
              state={state}
              datasets={state.datasets}
              theme={state.dashboard.theme}
              ragRules={state.ragRules ?? []}
              annotations={state.annotations ?? []}
              dashboardTitle={state.dashboard.title}
              onAddTile={() => {}}
              onLayoutChange={() => {}}
              onTileClick={() => {}}
              onDeleteTile={() => {}}
              onDuplicateTile={() => {}}
              onDetailsTile={() => {}}
              readOnly
            />
          )}
        </div>

        {/* Guide panel */}
        {showGuide && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-800">What am I looking at?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{example.learningGoal}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {guideItems.map((item, idx) => {
                const isOpen = expandedGuide === item.chartName;
                return (
                  <div
                    key={item.chartName}
                    className="rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGuide(isOpen ? null : item.chartName)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="w-5 h-5 flex-shrink-0 rounded-full bg-[#005EB8]/10 text-[#005EB8] text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-xs font-medium text-slate-700 leading-snug">
                        {item.title}
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 pt-1">
                        {item.chartType && (
                          <span className="inline-block text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mb-2 uppercase">
                            {item.chartType} chart
                          </span>
                        )}
                        <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleUse}
                className="w-full text-sm font-semibold py-2.5 rounded-xl bg-[#005EB8] text-white hover:bg-[#004da0] transition-colors"
              >
                Use as starting point
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Copies this dashboard with the sample data into your session.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
