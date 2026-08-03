'use client';

import { useState } from 'react';
import type { TitleTileConfig } from '@/lib/dashboard/types';

interface TitleTileEditorProps {
  initialConfig?: TitleTileConfig;
  onSave: (config: TitleTileConfig) => void;
  onCancel: () => void;
}

const ACCENT_SWATCHES = ['#005EB8', '#003087', '#41B6E6', '#007f3b', '#d5281b', '#ae2573'];

const DEFAULT: TitleTileConfig = {
  title: '',
  subtitle: '',
  accent: '#005EB8',
  alignment: 'left',
  backgroundKind: 'white',
};

export default function TitleTileEditor({ initialConfig, onSave, onCancel }: TitleTileEditorProps) {
  const [form, setForm] = useState<TitleTileConfig>(initialConfig ?? { ...DEFAULT });
  const isNew = !initialConfig;
  const canSave = form.title.trim().length > 0;

  const set = (patch: Partial<TitleTileConfig>) => setForm((f) => ({ ...f, ...patch }));

  const isAccent = form.backgroundKind === 'accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Left: form */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">
              {isNew ? 'Add title tile' : 'Edit title tile'}
            </h2>
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1">
            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Quarterly Performance Review"
                autoFocus
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]/40"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Subtitle</span>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
                placeholder="Optional subtitle or date range"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]/40"
              />
            </label>

            <div>
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Alignment</span>
              <div className="flex gap-2 mt-2">
                {(['left', 'center'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => set({ alignment: a })}
                    className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                      form.alignment === a
                        ? 'bg-[#005EB8] border-[#005EB8] text-white'
                        : 'border-gray-300 text-gray-700 hover:border-[#005EB8] hover:text-[#005EB8]'
                    }`}
                  >
                    {a === 'left' ? 'Left' : 'Centre'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Background</span>
              <div className="flex gap-2 mt-2">
                {(['white', 'accent'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set({ backgroundKind: b })}
                    className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                      form.backgroundKind === b
                        ? 'bg-[#005EB8] border-[#005EB8] text-white'
                        : 'border-gray-300 text-gray-700 hover:border-[#005EB8] hover:text-[#005EB8]'
                    }`}
                  >
                    {b === 'white' ? 'White' : 'Coloured'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Accent colour</span>
              <div className="flex gap-2 mt-2">
                {ACCENT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => set({ accent: hex })}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: hex,
                      borderColor: form.accent === hex ? '#1e293b' : 'transparent',
                      boxShadow: form.accent === hex ? `0 0 0 2px #fff, 0 0 0 4px ${hex}` : undefined,
                    }}
                    title={hex}
                  />
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
              onClick={() => canSave && onSave(form)}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg bg-[#005EB8] hover:bg-[#003087] text-white text-sm font-medium
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isNew ? 'Add to dashboard' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-72 flex-shrink-0 bg-slate-50 border-l border-gray-200 flex flex-col p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Preview</p>
          <div className="flex-1 flex items-center">
            <div
              className="w-full rounded-xl overflow-hidden shadow-sm"
              style={{ backgroundColor: isAccent ? form.accent : '#fff' }}
            >
              {!isAccent && (
                <div className="h-1" style={{ backgroundColor: form.accent }} />
              )}
              <div
                className={`px-5 py-4 flex flex-col justify-center ${form.alignment === 'center' ? 'items-center text-center' : ''}`}
              >
                <p
                  className="font-bold leading-tight"
                  style={{ color: isAccent ? '#fff' : '#1e293b', fontSize: '1.05rem' }}
                >
                  {form.title || 'Section title'}
                </p>
                {form.subtitle && (
                  <p
                    className="text-sm mt-0.5 leading-snug"
                    style={{ color: isAccent ? 'rgba(255,255,255,0.8)' : '#64748b' }}
                  >
                    {form.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
