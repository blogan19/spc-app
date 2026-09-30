'use client';

import { useState } from 'react';
import { EXAMPLES, type ExampleDef } from '@/lib/dashboard/examples';

interface Props {
  onView: (example: ExampleDef) => void;
  onDismiss: () => void;
}

const FILTERS = ['All', 'SPC', 'KPI', 'Pareto', 'Heatmap', 'A&E', 'Waiting times', 'Workforce', 'Patient safety'];

// Map chart type labels to a compact coloured badge style
function ChartBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();
  let bg = 'bg-slate-100 text-slate-600';
  if (lower.includes('spc') || lower.includes('xmr')) bg = 'bg-blue-100 text-indigo-700';
  else if (lower.includes('kpi')) bg = 'bg-emerald-100 text-emerald-700';
  else if (lower.includes('pareto')) bg = 'bg-amber-100 text-amber-700';
  else if (lower.includes('heatmap')) bg = 'bg-purple-100 text-purple-700';
  else if (lower.includes('area')) bg = 'bg-cyan-100 text-cyan-700';
  else if (lower.includes('line')) bg = 'bg-indigo-100 text-indigo-700';
  else if (lower.includes('bar')) bg = 'bg-orange-100 text-orange-700';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg}`}>{label}</span>
  );
}

export default function ExampleGallery({ onView, onDismiss }: Props) {
  const [filter, setFilter] = useState('All');

  const visible = filter === 'All'
    ? EXAMPLES
    : EXAMPLES.filter((e) =>
        e.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())) ||
        e.chartTypes.some((t) => t.toLowerCase().includes(filter.toLowerCase()))
      );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Example dashboards</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fully-built dashboards with realistic NHS synthetic data. View any example, then copy it as your own starting point.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-6 pt-3 pb-1 flex items-center gap-1.5 flex-wrap border-b border-slate-50">
          {FILTERS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFilter(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6">
          {visible.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">No examples match this filter.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((ex) => (
                <div
                  key={ex.id}
                  className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Card header strip */}
                  <div className="bg-slate-50 px-4 py-3 flex items-center gap-3 border-b border-slate-100">
                    <span className="text-2xl flex-shrink-0">{ex.icon}</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 leading-snug">{ex.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ex.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <p className="text-xs text-slate-500 leading-snug">{ex.description}</p>

                    {/* Chart types */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Chart types in this example</p>
                      <div className="flex flex-wrap gap-1">
                        {ex.chartTypes.map((ct) => (
                          <ChartBadge key={ct} label={ct} />
                        ))}
                      </div>
                    </div>

                    {/* Learning goal */}
                    <div className="bg-indigo-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">What you will learn</p>
                      <p className="text-xs text-blue-800 leading-snug">{ex.learningGoal}</p>
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={() => onView(ex)}
                      className="mt-auto w-full text-sm font-medium py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 group-hover:shadow-sm transition-all"
                    >
                      View example →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-amber-50">
          <p className="text-xs text-amber-700">
            All examples use synthetic data — not real NHS figures. After copying an example, replace the dataset with your own.
          </p>
        </div>
      </div>
    </div>
  );
}
