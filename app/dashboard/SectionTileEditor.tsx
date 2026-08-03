'use client';

import { useState } from 'react';
import type { SectionTileConfig } from '@/lib/dashboard/types';

interface SectionTileEditorProps {
  initialConfig?: SectionTileConfig;
  onSave: (config: SectionTileConfig) => void;
  onCancel: () => void;
}

const BORDER_SWATCHES = ['#005EB8', '#003087', '#41B6E6', '#007f3b', '#d5281b', '#ae2573'];

const BG_OPTIONS: { label: string; value: string }[] = [
  { label: 'Light blue', value: '#EEF4FF' },
  { label: 'Light green', value: '#EEFAF4' },
  { label: 'Light grey', value: '#F5F5F5' },
  { label: 'White', value: '#FFFFFF' },
];

const DEFAULT: SectionTileConfig = {
  label: '',
  borderColor: '#005EB8',
  backgroundColor: '#EEF4FF',
};

export default function SectionTileEditor({ initialConfig, onSave, onCancel }: SectionTileEditorProps) {
  const [form, setForm] = useState<SectionTileConfig>(initialConfig ?? { ...DEFAULT });
  const isNew = !initialConfig;

  const set = (patch: Partial<SectionTileConfig>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Left: form */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">
              {isNew ? 'Add section tile' : 'Edit section tile'}
            </h2>
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Section label</span>
              <input
                type="text"
                value={form.label}
                onChange={(e) => set({ label: e.target.value })}
                placeholder="e.g. Quality metrics"
                autoFocus
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]/40"
              />
            </label>

            <div>
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Border colour</span>
              <div className="flex gap-2 mt-2">
                {BORDER_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => set({ borderColor: hex })}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: hex,
                      borderColor: form.borderColor === hex ? '#1e293b' : 'transparent',
                      boxShadow: form.borderColor === hex ? `0 0 0 2px #fff, 0 0 0 4px ${hex}` : undefined,
                    }}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Background</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {BG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set({ backgroundColor: opt.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.backgroundColor === opt.value
                        ? 'border-[#005EB8] text-[#005EB8] bg-blue-50'
                        : 'border-gray-300 text-gray-700 hover:border-[#005EB8] hover:text-[#005EB8]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: opt.value }}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 pb-5 flex gap-2 justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              className="px-4 py-2 rounded-lg bg-[#005EB8] hover:bg-[#003087] text-white text-sm font-medium transition-colors"
            >
              {isNew ? 'Add to dashboard' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-72 flex-shrink-0 bg-slate-50 border-l border-gray-200 flex flex-col p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Preview</p>
          <div className="flex-1 flex items-stretch" style={{ minHeight: 160 }}>
            <div
              className="w-full rounded-xl relative"
              style={{
                backgroundColor: form.backgroundColor,
                border: `2px solid ${form.borderColor}`,
              }}
            >
              {form.label && (
                <span
                  className="absolute top-2 left-3 text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ color: form.borderColor, backgroundColor: form.backgroundColor }}
                >
                  {form.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
