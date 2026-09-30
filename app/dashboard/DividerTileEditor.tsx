'use client';

import { useState } from 'react';
import type { DividerTileConfig } from '@/lib/dashboard/types';

interface DividerTileEditorProps {
  initialConfig?: DividerTileConfig;
  onSave: (config: DividerTileConfig) => void;
  onCancel: () => void;
}

const DEFAULT: DividerTileConfig = {
  label: '',
  color: '#e2e8f0',
  thickness: 1,
  labelPosition: 'left',
};

export default function DividerTileEditor({ initialConfig, onSave, onCancel }: DividerTileEditorProps) {
  const [form, setForm] = useState<DividerTileConfig>(initialConfig ?? { ...DEFAULT });
  const set = (patch: Partial<DividerTileConfig>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialConfig ? 'Edit divider' : 'Add divider'}
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Label (optional)</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="e.g. Section heading"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Line colour</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set({ color: e.target.value })}
                  className="w-9 h-9 cursor-pointer rounded border border-gray-200 p-0.5"
                />
                <span className="text-xs text-gray-400 font-mono">{form.color}</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Thickness</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={form.thickness}
                  onChange={(e) => set({ thickness: Number(e.target.value) })}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-xs text-gray-500 w-6">{form.thickness}px</span>
              </div>
            </label>
          </div>

          {form.label && (
            <div>
              <span className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Label position</span>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => set({ labelPosition: pos })}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors capitalize ${
                      form.labelPosition === pos
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-xs text-gray-400 mb-3">Preview</p>
            <div className="relative" style={{ borderTop: `${form.thickness}px solid ${form.color}` }}>
              {form.label && (
                <span
                  className={`absolute -top-2.5 bg-gray-50 px-2 text-xs text-slate-500 ${
                    form.labelPosition === 'center' ? 'left-1/2 -translate-x-1/2'
                      : form.labelPosition === 'right' ? 'right-4' : 'left-4'
                  }`}
                >
                  {form.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(form)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
