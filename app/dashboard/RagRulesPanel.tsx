'use client';

import { useState } from 'react';
import type { RagRule } from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';
import { evaluateRag, RAG_BADGE, RAG_LABEL, describeRule } from '@/lib/dashboard/rag';

interface RagRulesPanelProps {
  rules: RagRule[];
  onChange: (rules: RagRule[]) => void;
  onClose: () => void;
}

function emptyRule(): RagRule {
  return {
    id: newId(),
    name: '',
    higherIsBetter: true,
    greenThreshold: 95,
    amberThreshold: 85,
    unit: '%',
  };
}

function RuleForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: RagRule;
  onSave: (r: RagRule) => void;
  onCancel: () => void;
}) {
  const [r, setR] = useState<RagRule>(rule);
  const set = (patch: Partial<RagRule>) => setR((prev) => ({ ...prev, ...patch }));

  const preview = (v: number) => {
    const status = evaluateRag(v, r);
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${RAG_BADGE[status]}`} />
        {RAG_LABEL[status]}
      </span>
    );
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rule name</label>
        <input
          type="text"
          value={r.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. 4-hour standard"
          autoFocus
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit (display only)</label>
          <input
            type="text"
            value={r.unit}
            onChange={(e) => set({ unit: e.target.value })}
            placeholder="% or days"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
          <div className="flex gap-1.5 pt-0.5">
            {([true, false] as const).map((h) => (
              <button
                key={String(h)}
                type="button"
                onClick={() => set({ higherIsBetter: h })}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                  r.higherIsBetter === h
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {h ? '↑ Higher' : '↓ Lower'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-emerald-700 mb-1">
            Green threshold {r.higherIsBetter ? '(≥ value)' : '(≤ value)'}
          </label>
          <input
            type="number"
            value={r.greenThreshold}
            onChange={(e) => set({ greenThreshold: Number(e.target.value) })}
            className="w-full text-sm border border-emerald-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-700 mb-1">
            Amber threshold {r.higherIsBetter ? '(≥ value)' : '(≤ value)'}
          </label>
          <input
            type="number"
            value={r.amberThreshold}
            onChange={(e) => set({ amberThreshold: Number(e.target.value) })}
            className="w-full text-sm border border-amber-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Logic preview */}
      <div className="text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100 space-y-0.5">
        <div className="font-medium text-gray-600 mb-1">How this rule reads:</div>
        <div>{describeRule(r)}</div>
      </div>

      {/* Value preview */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">Example values:</p>
        <div className="flex gap-3">
          {[r.greenThreshold, (r.greenThreshold + r.amberThreshold) / 2, r.amberThreshold - 1].map(
            (v, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{Math.round(v)}{r.unit}:</span>
                {preview(v)}
              </span>
            ),
          )}
        </div>
      </div>

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
          disabled={!r.name.trim()}
          onClick={() => onSave(r)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save rule
        </button>
      </div>
    </div>
  );
}

export default function RagRulesPanel({ rules, onChange, onClose }: RagRulesPanelProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  const saveRule = (rule: RagRule) => {
    onChange(
      editingId === 'new'
        ? [...rules, rule]
        : rules.map((r) => (r.id === rule.id ? rule : r)),
    );
    setEditingId(null);
  };

  const deleteRule = (id: string) => {
    if (!window.confirm('Remove this RAG rule? Tiles using it will lose their RAG status.')) return;
    onChange(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">RAG Rules</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define shared Green / Amber / Red thresholds. KPI tiles can apply any rule automatically.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {rules.length === 0 && editingId !== 'new' && (
            <p className="text-sm text-gray-400 text-center py-6">
              No RAG rules defined yet. Create one to apply consistent status thresholds across your KPI tiles.
            </p>
          )}

          {rules.map((rule) => {
            if (editingId === rule.id) {
              return (
                <RuleForm
                  key={rule.id}
                  rule={rule}
                  onSave={saveRule}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            return (
              <div
                key={rule.id}
                className="group border border-gray-200 rounded-xl p-3.5 bg-white hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{rule.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{describeRule(rule)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(['green', 'amber', 'red'] as const).map((s) => (
                      <span key={s} className={`w-3 h-3 rounded-full ${RAG_BADGE[s]}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setEditingId(rule.id)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    className="text-xs text-red-400 hover:text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {editingId === 'new' ? (
            <RuleForm
              rule={emptyRule()}
              onSave={saveRule}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingId('new')}
              className="w-full text-sm py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400
                         hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              + Add RAG rule
            </button>
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
