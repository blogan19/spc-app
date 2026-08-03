'use client';

import { useState } from 'react';
import type { Dataset, RefreshConfig } from '@/lib/dashboard/types';
import { nextPeriodLabel, lastPeriodValueFor, appendPeriod } from '@/lib/dashboard/refresh';

export interface RefreshTarget {
  dataset: Dataset;
  config: RefreshConfig;
}

interface AddPeriodModalProps {
  targets: RefreshTarget[];
  onSave: (updatedDatasets: Dataset[]) => void;
  onClose: () => void;
}

export default function AddPeriodModal({ targets, onSave, onClose }: AddPeriodModalProps) {
  const [entries, setEntries] = useState(() =>
    targets.map((t) => ({
      periodLabel: nextPeriodLabel(t.dataset, t.config),
      values: Object.fromEntries(t.config.valueColumns.map((c) => [c, ''])),
    })),
  );

  const updateEntry = (i: number, patch: Partial<typeof entries[0]>) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  const handleSubmit = () => {
    const updated = targets.map((t, i) => {
      const entry = entries[i];
      const numericValues = Object.fromEntries(
        Object.entries(entry.values).map(([k, v]) => [k, v.trim() === '' ? null : Number(v)]),
      );
      return appendPeriod(t.dataset, entry.periodLabel.trim(), numericValues, t.config);
    });
    onSave(updated);
  };

  const canSubmit = entries.every((e) => e.periodLabel.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add new period</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              New data will be appended to {targets.length === 1 ? targets[0].dataset.name : `${targets.length} datasets`}.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {targets.map((t, i) => {
            const entry = entries[i];
            return (
              <section key={t.dataset.id}>
                {targets.length > 1 && (
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-1.5 border-b border-gray-100">
                    {t.dataset.name}
                  </h3>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Period label
                    <span className="ml-1 font-normal text-gray-400">({t.config.periodColumn})</span>
                  </label>
                  <input
                    type="text"
                    value={entry.periodLabel}
                    onChange={(e) => updateEntry(i, { periodLabel: e.target.value })}
                    placeholder="e.g. Jul 2025"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  {t.config.valueColumns.map((col) => {
                    const prev = lastPeriodValueFor(t.dataset, col);
                    return (
                      <div key={col}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{col}</label>
                        <input
                          type="number"
                          value={entry.values[col]}
                          onChange={(e) =>
                            updateEntry(i, { values: { ...entry.values, [col]: e.target.value } })
                          }
                          placeholder="Enter value"
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {prev && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Last period: <span className="font-medium">{prev}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add period
          </button>
        </div>
      </div>
    </div>
  );
}
