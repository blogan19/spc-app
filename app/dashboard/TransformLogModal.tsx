'use client';

import type { Dataset, TransformLogEntry } from '@/lib/dashboard/types';

interface TransformLogModalProps {
  dataset: Dataset;
  onClose: () => void;
}

const CATEGORY_BADGE: Record<TransformLogEntry['category'], { label: string; cls: string }> = {
  IMPORT:          { label: 'Import',        cls: 'bg-blue-100 text-indigo-700' },
  COLUMN_TYPES:    { label: 'Column types',  cls: 'bg-purple-100 text-purple-700' },
  NUMERIC_PARSING: { label: 'Numeric',       cls: 'bg-emerald-100 text-emerald-700' },
  MISSING_VALUES:  { label: 'Missing data',  cls: 'bg-amber-100 text-amber-700' },
  PII_ACTION:      { label: 'PII',           cls: 'bg-red-100 text-red-700' },
};

export default function TransformLogModal({ dataset, onClose }: TransformLogModalProps) {
  const log = dataset.transformLog ?? [];

  return (
    <div className="absolute inset-0 bg-black/60 flex items-start justify-center pt-8 p-4 z-20">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Transformation log</h3>
            <p className="text-xs text-gray-500 mt-0.5">{dataset.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No transformation log available.</p>
          ) : (
            <ol className="space-y-4">
              {log.map((entry) => {
                const badge = CATEGORY_BADGE[entry.category];
                return (
                  <li key={entry.step} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
                      {entry.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-mono font-semibold text-gray-700">
                          {entry.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {entry.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">
            This log records every transformation applied to your data from upload to storage.
            It is read-only and included in your saved dashboard file.
          </p>
        </div>
      </div>
    </div>
  );
}
