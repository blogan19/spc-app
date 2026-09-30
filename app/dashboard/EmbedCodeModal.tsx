'use client';

import { useEffect, useState } from 'react';
import type { DashboardState } from '@/lib/dashboard/types';
import { compressState, estimateShareSize, stripDataForShare } from '@/lib/dashboard/share';

interface Props {
  state: DashboardState;
  onClose: () => void;
}

type SizePreset = 'responsive' | '800x600' | '1200x700' | '1400x800' | 'custom';

const PRESETS: { id: SizePreset; label: string; w?: number; h?: number }[] = [
  { id: 'responsive', label: 'Responsive (100% width)' },
  { id: '800x600',  label: '800 × 600',  w: 800,  h: 600  },
  { id: '1200x700', label: '1200 × 700', w: 1200, h: 700  },
  { id: '1400x800', label: '1400 × 800', w: 1400, h: 800  },
  { id: 'custom',   label: 'Custom…' },
];

export default function EmbedCodeModal({ state, onClose }: Props) {
  const [preset, setPreset] = useState<SizePreset>('1200x700');
  const [customW, setCustomW] = useState('1200');
  const [customH, setCustomH] = useState('700');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripped, setStripped] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const SIZE_LIMIT = 200_000;
    const stateToShare = estimateShareSize(state) > SIZE_LIMIT ? stripDataForShare(state) : state;
    setStripped(estimateShareSize(state) > SIZE_LIMIT);
    compressState(stateToShare)
      .then((compressed) => {
        setShareUrl(`${window.location.origin}/dashboard/view?d=${compressed}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [state]);

  const current = PRESETS.find((p) => p.id === preset)!;
  const w = preset === 'responsive' ? '100%' : preset === 'custom' ? customW : String(current.w);
  const h = preset === 'responsive' ? '600' : preset === 'custom' ? customH : String(current.h);

  const snippet = shareUrl
    ? `<iframe\n  src="${shareUrl}"\n  width="${w}"\n  height="${h}"\n  frameborder="0"\n  allowfullscreen\n  title="${state.dashboard.title || 'Dashboard'}"\n></iframe>`
    : '';

  const handleCopy = async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Embed dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Copy the snippet below and paste it into any web page or SharePoint page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Size picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Frame size</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    preset === p.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="flex items-center gap-3 mt-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                    className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <span className="text-slate-400 mt-4">×</span>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Code block */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Embed code</label>
            {loading ? (
              <div className="h-28 bg-slate-50 rounded-xl flex items-center justify-center">
                <span className="text-xs text-slate-400">Generating…</span>
              </div>
            ) : !shareUrl ? (
              <div className="h-28 bg-red-50 rounded-xl flex items-center justify-center">
                <span className="text-xs text-red-500">Could not generate embed code. Try saving your dashboard first.</span>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed select-all whitespace-pre">
                  {snippet}
                </pre>
              </div>
            )}
          </div>

          {stripped && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Your dashboard is large — dataset rows were excluded from the embed URL. Recipients will see the layout but charts may show no data.
            </p>
          )}

          <p className="text-xs text-slate-400">
            The embed renders a read-only, interactive view. Anyone who can access the page can view the dashboard — no login required.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!shareUrl || loading}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-80"><path d="M4 4h6v8H4zM6 2h6v8"/></svg>
                Copy code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
