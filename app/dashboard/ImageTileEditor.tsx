'use client';

import { useRef, useState } from 'react';
import type { ImageTileConfig } from '@/lib/dashboard/types';

interface ImageTileEditorProps {
  initialConfig?: ImageTileConfig;
  onSave: (config: ImageTileConfig) => void;
  onCancel: () => void;
}

const DEFAULT: ImageTileConfig = {
  dataUrl: '',
  title: '',
  objectFit: 'contain',
};

export default function ImageTileEditor({ initialConfig, onSave, onCancel }: ImageTileEditorProps) {
  const [config, setConfig] = useState<ImageTileConfig>(initialConfig ?? DEFAULT);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<ImageTileConfig>) => setConfig((c) => ({ ...c, ...p }));

  const handleFile = (file: File) => {
    setError('');
    if (!file.type.match(/^image\/(png|jpeg|gif|webp|svg\+xml)$/)) {
      setError('Unsupported file type. Use PNG, JPG, GIF, WebP, or SVG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Maximum size is 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      patch({ dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-md flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Image tile</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Drop / upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 hover:border-[#005EB8] rounded-xl transition-colors"
          >
            {config.dataUrl ? (
              <div className="relative">
                <img
                  src={config.dataUrl}
                  alt="Preview"
                  className="w-full rounded-xl"
                  style={{ maxHeight: 240, objectFit: config.objectFit }}
                />
                <button
                  type="button"
                  onClick={() => patch({ dataUrl: '' })}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white/90 border border-gray-200 text-gray-500 hover:text-red-500 shadow-sm"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-10 flex flex-col items-center gap-2 text-gray-400 hover:text-[#005EB8] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Zm10.5-10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                <span className="text-sm font-medium">Click to upload image</span>
                <span className="text-xs">or drag and drop · PNG, JPG, GIF, WebP, SVG · max 5 MB</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {config.dataUrl && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-[#005EB8] hover:underline"
            >
              Replace image
            </button>
          )}

          {/* Object fit */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Image fit</label>
            <div className="flex gap-2">
              {(['contain', 'cover', 'fill'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => patch({ objectFit: fit })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors capitalize ${
                    config.objectFit === fit
                      ? 'border-[#005EB8] bg-blue-50 text-[#005EB8] font-medium'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {config.objectFit === 'contain' && 'Show the whole image with letterboxing.'}
              {config.objectFit === 'cover' && 'Fill the tile, cropping edges if needed.'}
              {config.objectFit === 'fill' && 'Stretch to fill — may distort the image.'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Trust logo, Framework diagram"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!config.dataUrl}
            onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {initialConfig ? 'Save changes' : 'Add to dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
