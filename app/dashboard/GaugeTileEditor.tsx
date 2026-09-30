'use client';

import { useState } from 'react';
import type { GaugeTileConfig } from '@/lib/dashboard/types';
import DashGaugeChart from './charts/DashGaugeChart';

interface GaugeTileEditorProps {
  initialConfig?: GaugeTileConfig;
  onSave: (config: GaugeTileConfig) => void;
  onCancel: () => void;
}

const DEFAULT: GaugeTileConfig = {
  label: '',
  value: null,
  minValue: 0,
  maxValue: 100,
  unit: '%',
  greenThreshold: 75,
  amberThreshold: 50,
  higherIsBetter: true,
};

export default function GaugeTileEditor({ initialConfig, onSave, onCancel }: GaugeTileEditorProps) {
  const [form, setForm] = useState<GaugeTileConfig>(initialConfig ?? { ...DEFAULT });
  const isNew = !initialConfig;

  const set = (patch: Partial<GaugeTileConfig>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    if (!form.label.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add gauge tile' : 'Edit gauge tile'}
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Label *
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
                placeholder="e.g. 82"
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Min value
              </span>
              <input
                type="number"
                value={form.minValue}
                onChange={(e) => set({ minValue: Number(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Max value
              </span>
              <input
                type="number"
                value={form.maxValue}
                onChange={(e) => set({ maxValue: Number(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Green threshold
              </span>
              <input
                type="number"
                value={form.greenThreshold}
                onChange={(e) => set({ greenThreshold: Number(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Amber threshold
              </span>
              <input
                type="number"
                value={form.amberThreshold}
                onChange={(e) => set({ amberThreshold: Number(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.higherIsBetter}
              onChange={(e) => set({ higherIsBetter: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span className="text-sm text-gray-700">Higher value is better</span>
          </label>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Preview</p>
            <div className="flex justify-center bg-gray-50 rounded-xl p-2">
              <DashGaugeChart
                label={form.label || 'Label'}
                value={form.value}
                minValue={form.minValue}
                maxValue={form.maxValue}
                unit={form.unit}
                greenThreshold={form.greenThreshold}
                amberThreshold={form.amberThreshold}
                higherIsBetter={form.higherIsBetter}
                width={300}
                height={200}
                fontFamily="Arial"
              />
            </div>
          </div>
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
