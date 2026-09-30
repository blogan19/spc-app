'use client';

import { useState } from 'react';
import type { MetricDef, RagRule, ReviewFrequency } from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';
import { NHS_METRICS } from '@/lib/dashboard/metrics';

interface MetricLibraryPanelProps {
  metrics: MetricDef[];
  ragRules: RagRule[];
  onChange: (metrics: MetricDef[]) => void;
  onClose: () => void;
}

function emptyMetric(): MetricDef {
  return {
    id: newId(),
    name: '',
    description: '',
    unit: '',
    targetValue: null,
    targetLabel: 'Local target',
    targetDirection: 'higher',
    ragRuleId: '',
    dataSourceHint: '',
    reviewFrequency: 'monthly',
  };
}

const DIRECTION_OPTS: { value: MetricDef['targetDirection']; label: string }[] = [
  { value: 'higher', label: '↑ Higher is better' },
  { value: 'lower', label: '↓ Lower is better' },
  { value: 'range', label: '↔ Within range' },
];

const FREQ_OPTS: { value: ReviewFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

function MetricForm({
  metric,
  ragRules,
  onSave,
  onCancel,
}: {
  metric: MetricDef;
  ragRules: RagRule[];
  onSave: (m: MetricDef) => void;
  onCancel: () => void;
}) {
  const [m, setM] = useState<MetricDef>(metric);
  const set = (patch: Partial<MetricDef>) => setM((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Metric name *</label>
        <input
          type="text"
          value={m.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. A&E 4-hour standard"
          autoFocus
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={m.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          placeholder="Plain English explanation of what this metric measures"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Unit + review frequency */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input
            type="text"
            value={m.unit}
            onChange={(e) => set({ unit: e.target.value })}
            placeholder="%, days, count, £"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Review frequency</label>
          <select
            value={m.reviewFrequency}
            onChange={(e) => set({ reviewFrequency: e.target.value as ReviewFrequency })}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FREQ_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Target value + label */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target value</label>
          <input
            type="number"
            value={m.targetValue ?? ''}
            onChange={(e) => set({ targetValue: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 95"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target label</label>
          <input
            type="text"
            value={m.targetLabel}
            onChange={(e) => set({ targetLabel: e.target.value })}
            placeholder="e.g. NHSE standard"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Target direction */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
        <div className="flex gap-1.5">
          {DIRECTION_OPTS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set({ targetDirection: o.value })}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                m.targetDirection === o.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* RAG rule */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">RAG rule (optional)</label>
        <select
          value={m.ragRuleId}
          onChange={(e) => set({ ragRuleId: e.target.value })}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No RAG rule</option>
          {ragRules.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Data source hint */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Data source hint</label>
        <input
          type="text"
          value={m.dataSourceHint}
          onChange={(e) => set({ dataSourceHint: e.target.value })}
          placeholder="e.g. ED system extract / ECDS"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-xs py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!m.name.trim()}
          onClick={() => onSave(m)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save metric
        </button>
      </div>
    </div>
  );
}

export default function MetricLibraryPanel({ metrics, ragRules, onChange, onClose }: MetricLibraryPanelProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [showNhs, setShowNhs] = useState(true);

  const saveMetric = (metric: MetricDef) => {
    if (editingId === 'new') {
      onChange([...metrics, metric]);
    } else {
      onChange(metrics.map((m) => (m.id === metric.id ? metric : m)));
    }
    setEditingId(null);
  };

  const deleteMetric = (id: string) => {
    if (!window.confirm('Remove this metric? KPI tiles using it will retain their current values but lose the library link.')) return;
    onChange(metrics.filter((m) => m.id !== id));
  };

  const addNhsMetric = (nhsMetric: MetricDef) => {
    if (metrics.find((m) => m.id === nhsMetric.id)) return; // already added
    onChange([...metrics, nhsMetric]);
  };

  const query = search.toLowerCase();
  const filtered = metrics.filter(
    (m) => !query || m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query),
  );
  const nhsFiltered = NHS_METRICS.filter(
    (m) => !metrics.find((existing) => existing.id === m.id) && (!query || m.name.toLowerCase().includes(query)),
  );

  const dirIcon = (d: MetricDef['targetDirection']) =>
    d === 'higher' ? '↑' : d === 'lower' ? '↓' : '↔';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Metric Library</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define reusable metric definitions. KPI tiles can link to a metric to auto-fill labels, targets, and RAG thresholds.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search metrics..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Your metrics */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Your metrics ({filtered.length})
            </p>
            <div className="space-y-2">
              {filtered.length === 0 && editingId !== 'new' && (
                <p className="text-sm text-gray-400 text-center py-3">
                  {search ? 'No matching metrics.' : 'No custom metrics yet. Add one below or import from the NHS library.'}
                </p>
              )}
              {filtered.map((metric) => {
                if (editingId === metric.id) {
                  return (
                    <MetricForm
                      key={metric.id}
                      metric={metric}
                      ragRules={ragRules}
                      onSave={saveMetric}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }
                return (
                  <div
                    key={metric.id}
                    className="group border border-gray-200 rounded-xl p-3.5 bg-white hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base font-bold text-gray-400 flex-shrink-0 w-5 text-center mt-0.5">
                        {dirIcon(metric.targetDirection)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{metric.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {metric.unit && (
                            <span className="text-xs text-gray-400">{metric.unit}</span>
                          )}
                          {metric.targetValue != null && (
                            <span className="text-xs text-gray-400">
                              Target: {metric.targetValue}{metric.unit} ({metric.targetLabel})
                            </span>
                          )}
                          <span className="text-xs text-gray-300">{metric.reviewFrequency}</span>
                        </div>
                        {metric.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{metric.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingId(metric.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMetric(metric.id)}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              {editingId === 'new' ? (
                <MetricForm
                  metric={emptyMetric()}
                  ragRules={ragRules}
                  onSave={saveMetric}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId('new')}
                  className="w-full text-sm py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400
                             hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Add custom metric
                </button>
              )}
            </div>
          </div>

          {/* NHS pre-seeded library */}
          {nhsFiltered.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowNhs((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700"
              >
                <span>{showNhs ? '▾' : '▸'}</span>
                NHS standard metrics — click to add ({nhsFiltered.length})
              </button>
              {showNhs && (
                <div className="space-y-1.5">
                  {nhsFiltered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addNhsMetric(m)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <span className="text-sm font-bold text-gray-300 group-hover:text-indigo-600 w-5 text-center flex-shrink-0">
                        {dirIcon(m.targetDirection)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">{m.name}</p>
                        <p className="text-xs text-gray-400">
                          {m.unit}{m.targetValue != null ? ` · Target: ${m.targetValue}${m.unit}` : ''} · {m.dataSourceHint}
                        </p>
                      </div>
                      <span className="text-xs text-gray-300 group-hover:text-indigo-600 flex-shrink-0">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
