'use client';

import { useState } from 'react';
import type { KpiTileConfig, RagRule, MetricDef } from '@/lib/dashboard/types';
import { evaluateRag, RAG_BG, RAG_BADGE, RAG_LABEL, describeRule } from '@/lib/dashboard/rag';

interface KpiTileEditorProps {
  initialConfig?: KpiTileConfig;
  ragRules: RagRule[];
  metrics: MetricDef[];
  onSave: (config: KpiTileConfig) => void;
  onCancel: () => void;
}

const DEFAULT: KpiTileConfig = {
  label: '',
  value: null,
  unit: '',
  comparisonValue: undefined,
  comparisonLabel: '',
  higherIsBetter: true,
  ragRuleId: undefined,
};

export default function KpiTileEditor({ initialConfig, ragRules, metrics, onSave, onCancel }: KpiTileEditorProps) {
  const [form, setForm] = useState<KpiTileConfig>(initialConfig ?? { ...DEFAULT });
  const isNew = !initialConfig;

  const applyMetric = (metric: MetricDef) => {
    setForm((f) => ({
      ...f,
      label: metric.name,
      unit: metric.unit,
      comparisonValue: metric.targetValue ?? undefined,
      comparisonLabel: metric.targetLabel,
      higherIsBetter: metric.targetDirection !== 'lower',
      ragRuleId: metric.ragRuleId || undefined,
      metricId: metric.id,
    }));
  };

  const clearMetric = () => {
    setForm((f) => ({ ...f, metricId: undefined }));
  };

  const linkedMetric = form.metricId ? metrics.find((m) => m.id === form.metricId) : null;

  const set = (patch: Partial<KpiTileConfig>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    if (!form.label.trim()) return;
    onSave(form);
  };

  const activeRule = ragRules.find((r) => r.id === form.ragRuleId) ?? null;
  const ragStatus =
    activeRule && form.value != null ? evaluateRag(form.value, activeRule) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add KPI tile' : 'Edit KPI tile'}
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Metric library picker */}
          {metrics.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <p className="text-xs font-medium text-indigo-700 mb-2">From metric library</p>
              {linkedMetric ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-blue-800 truncate">{linkedMetric.name}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('metric-select') as HTMLSelectElement | null;
                        if (el) el.value = '';
                        clearMetric();
                      }}
                      className="text-xs text-blue-500 hover:text-indigo-700 underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  id="metric-select"
                  defaultValue=""
                  onChange={(e) => {
                    const m = metrics.find((x) => x.id === e.target.value);
                    if (m) applyMetric(m);
                    e.target.value = '';
                  }}
                  className="w-full text-sm border border-blue-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— pick a metric to pre-fill fields —</option>
                  {metrics.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Metric label *
            </span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="e.g. 4-hour standard"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Current value
              </span>
              <input
                type="number"
                value={form.value ?? ''}
                onChange={(e) =>
                  set({ value: e.target.value === '' ? null : Number(e.target.value) })
                }
                placeholder="91.4"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Unit</span>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => set({ unit: e.target.value })}
                placeholder="% or days or £"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Comparison (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600">Target value</span>
                <input
                  type="number"
                  value={form.comparisonValue ?? ''}
                  onChange={(e) =>
                    set({
                      comparisonValue: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="95"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">Label</span>
                <input
                  type="text"
                  value={form.comparisonLabel ?? ''}
                  onChange={(e) => set({ comparisonLabel: e.target.value })}
                  placeholder="Target"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={form.higherIsBetter}
                onChange={(e) => set({ higherIsBetter: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700">Higher value is better</span>
            </label>
          </div>

          {/* Colours */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Colours (optional)
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                  <input
                    type="color"
                    value={form.bgColor ?? '#f8fafc'}
                    onChange={(e) => set({ bgColor: e.target.value })}
                    className="w-7 h-7 cursor-pointer rounded border border-gray-200 p-0.5"
                  />
                  <span className="text-sm text-gray-700">Background</span>
                </label>
                {form.bgColor && (
                  <button type="button" onClick={() => set({ bgColor: undefined })} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                  <input
                    type="color"
                    value={form.valueColor ?? '#111827'}
                    onChange={(e) => set({ valueColor: e.target.value })}
                    className="w-7 h-7 cursor-pointer rounded border border-gray-200 p-0.5"
                  />
                  <span className="text-sm text-gray-700">Value text</span>
                </label>
                {form.valueColor && (
                  <button type="button" onClick={() => set({ valueColor: undefined })} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                  <input
                    type="color"
                    value={form.labelColor ?? '#6b7280'}
                    onChange={(e) => set({ labelColor: e.target.value })}
                    className="w-7 h-7 cursor-pointer rounded border border-gray-200 p-0.5"
                  />
                  <span className="text-sm text-gray-700">Label text</span>
                </label>
                {form.labelColor && (
                  <button type="button" onClick={() => set({ labelColor: undefined })} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
                )}
              </div>
            </div>
          </div>

          {/* RAG status */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              RAG status
            </p>
            <select
              value={form.ragRuleId ?? ''}
              onChange={(e) => set({ ragRuleId: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No RAG status</option>
              {ragRules.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {ragRules.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No RAG rules defined yet — close this editor and use the RAG Rules button in the toolbar.
              </p>
            )}
            {activeRule && (
              <p className="text-xs text-gray-400 mt-1">{describeRule(activeRule)}</p>
            )}
          </div>

          {/* Preview */}
          {form.label && form.value != null && (
            <div
              className={`border border-gray-200 rounded-xl p-4 text-center transition-colors ${
                ragStatus ? RAG_BG[ragStatus] : 'bg-gray-50'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Preview</p>
              {ragStatus && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${RAG_BADGE[ragStatus]}`} />
                  {RAG_LABEL[ragStatus]}
                </span>
              )}
              <p className="text-xs text-gray-400 font-medium">{form.label}</p>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-3xl font-bold text-gray-900">
                  {form.value.toLocaleString()}
                </span>
                {form.unit && <span className="text-xl text-gray-400">{form.unit}</span>}
              </div>
              {form.comparisonValue != null && (
                <p
                  className={`text-sm font-medium mt-1 ${
                    (form.higherIsBetter
                      ? form.value >= form.comparisonValue
                      : form.value <= form.comparisonValue)
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {form.value >= form.comparisonValue ? '▲' : '▼'} {form.comparisonLabel || 'Target'}:{' '}
                  {form.comparisonValue}
                  {form.unit}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.label.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isNew ? 'Add to dashboard' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
