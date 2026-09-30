'use client';

import { useState } from 'react';
import { TEMPLATES, type TemplateDef } from '@/lib/dashboard/templates';

interface TemplateGalleryProps {
  onSelect: (template: TemplateDef) => void;
  onDismiss: () => void;
}

export default function TemplateGallery({ onSelect, onDismiss }: TemplateGalleryProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Start from a template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pre-built with realistic NHS sample data — replace with your own data at any time</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Sample data notice */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5 text-xs text-amber-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span><strong>Sample data only</strong> — these templates use realistic but entirely synthetic NHS data. No real patient or organisational data is included. Replace with your own by uploading a CSV from the Datasets panel.</span>
          </div>

          <div className="space-y-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelect(tpl)}
                onMouseEnter={() => setHovered(tpl.id)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all
                  ${hovered === tpl.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                  }`}
              >
                <span className="text-3xl flex-shrink-0 mt-0.5">{tpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{tpl.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`flex-shrink-0 text-lg transition-transform ${hovered === tpl.id ? 'translate-x-0.5 text-indigo-600' : 'text-gray-300'}`}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">Or start with a blank dashboard and add tiles manually</p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Start blank
          </button>
        </div>
      </div>
    </div>
  );
}
