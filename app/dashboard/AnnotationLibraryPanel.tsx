'use client';

import { useState } from 'react';
import type { AnnotationDef } from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';
import { NHS_ANNOTATIONS } from '@/lib/dashboard/annotations';

interface AnnotationLibraryPanelProps {
  annotations: AnnotationDef[];
  onChange: (annotations: AnnotationDef[]) => void;
  onClose: () => void;
}

function emptyAnnotation(): AnnotationDef {
  return {
    id: newId(),
    label: '',
    date: new Date().toISOString().slice(0, 10),
    endDate: '',
    color: '#6b7280',
    description: '',
  };
}

const PRESET_COLORS = [
  '#005EB8', '#003087', '#41B6E6', '#007f3b', '#d5281b',
  '#e6861b', '#7c3aed', '#6b7280',
];

function AnnotationForm({
  annotation,
  onSave,
  onCancel,
}: {
  annotation: AnnotationDef;
  onSave: (a: AnnotationDef) => void;
  onCancel: () => void;
}) {
  const [a, setA] = useState<AnnotationDef>(annotation);
  const set = (patch: Partial<AnnotationDef>) => setA((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
        <input
          type="text"
          value={a.label}
          onChange={(e) => set({ label: e.target.value })}
          placeholder="e.g. New pathway launched"
          autoFocus
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start date *</label>
          <input
            type="date"
            value={a.date}
            onChange={(e) => set({ date: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            End date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={a.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      {a.endDate && (
        <p className="text-xs text-gray-400">A shaded region will be drawn between start and end date.</p>
      )}

      {/* Colour */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Colour</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ color: c })}
              className={`w-6 h-6 rounded-full transition-all ${
                a.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={a.color}
            onChange={(e) => set({ color: e.target.value })}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
            title="Custom colour"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={a.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={2}
          placeholder="Context for this annotation (shown in tooltip)"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
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
          disabled={!a.label.trim() || !a.date}
          onClick={() => onSave(a)}
          className="flex-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save annotation
        </button>
      </div>
    </div>
  );
}

export default function AnnotationLibraryPanel({ annotations, onChange, onClose }: AnnotationLibraryPanelProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [showNhs, setShowNhs] = useState(true);

  const saveAnnotation = (ann: AnnotationDef) => {
    if (editingId === 'new') {
      onChange([...annotations, ann]);
    } else {
      onChange(annotations.map((a) => (a.id === ann.id ? ann : a)));
    }
    setEditingId(null);
  };

  const deleteAnnotation = (id: string) => {
    if (!window.confirm('Remove this annotation? Charts using it will no longer display this marker.')) return;
    onChange(annotations.filter((a) => a.id !== id));
  };

  const addNhsAnnotation = (nhsAnn: AnnotationDef) => {
    if (annotations.find((a) => a.id === nhsAnn.id)) return;
    onChange([...annotations, nhsAnn]);
  };

  const query = search.toLowerCase();
  const filtered = annotations.filter(
    (a) => !query || a.label.toLowerCase().includes(query) || a.description.toLowerCase().includes(query),
  );
  const nhsFiltered = NHS_ANNOTATIONS.filter(
    (a) => !annotations.find((existing) => existing.id === a.id) && (!query || a.label.toLowerCase().includes(query)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Annotation Library</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Reusable event markers for line and run charts. Apply them per-chart in the chart editor.
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
            placeholder="Search annotations..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Your annotations */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Your annotations ({filtered.length})
            </p>
            <div className="space-y-2">
              {filtered.length === 0 && editingId !== 'new' && (
                <p className="text-sm text-gray-400 text-center py-3">
                  {search ? 'No matching annotations.' : 'No annotations yet. Add one or import from the NHS library below.'}
                </p>
              )}
              {filtered.map((ann) => {
                if (editingId === ann.id) {
                  return (
                    <AnnotationForm
                      key={ann.id}
                      annotation={ann}
                      onSave={saveAnnotation}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }
                return (
                  <div
                    key={ann.id}
                    className="group border border-gray-200 rounded-xl p-3 bg-white hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: ann.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{ann.label}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                            {ann.date}{ann.endDate ? ` → ${ann.endDate}` : ''}
                          </span>
                        </div>
                        {ann.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ann.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity pl-5">
                      <button
                        type="button"
                        onClick={() => setEditingId(ann.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAnnotation(ann.id)}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {editingId === 'new' ? (
                <AnnotationForm
                  annotation={emptyAnnotation()}
                  onSave={saveAnnotation}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId('new')}
                  className="w-full text-sm py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400
                             hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Add annotation
                </button>
              )}
            </div>
          </div>

          {/* NHS pre-seeded */}
          {nhsFiltered.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowNhs((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 hover:text-gray-700"
              >
                <span>{showNhs ? '▾' : '▸'}</span>
                NHS common events — click to add ({nhsFiltered.length})
              </button>
              {showNhs && (
                <div className="space-y-1.5">
                  {nhsFiltered.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => addNhsAnnotation(a)}
                      className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: a.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">{a.label}</p>
                        <p className="text-xs text-gray-400">{a.date} — edit date after adding</p>
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
