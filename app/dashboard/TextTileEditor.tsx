'use client';

import { useState } from 'react';
import type { TextTileConfig } from '@/lib/dashboard/types';

interface TextTileEditorProps {
  initialConfig?: TextTileConfig;
  onSave: (config: TextTileConfig) => void;
  onCancel: () => void;
}

export default function TextTileEditor({ initialConfig, onSave, onCancel }: TextTileEditorProps) {
  const [title, setTitle] = useState(initialConfig?.title ?? '');
  const [content, setContent] = useState(initialConfig?.content ?? '');
  const isNew = !initialConfig;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isNew ? 'Add text block' : 'Edit text block'}
          </h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Title (optional)
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Key findings"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Content
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Write commentary, contextual notes, or interpretation here…"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Plain text. Use blank lines to separate paragraphs.</p>
          </label>
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
            onClick={() => onSave({ title: title.trim(), content: content.trim() })}
            disabled={!content.trim()}
            className="px-4 py-2 rounded-lg bg-[#005EB8] hover:bg-[#003087] text-white text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isNew ? 'Add to dashboard' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
