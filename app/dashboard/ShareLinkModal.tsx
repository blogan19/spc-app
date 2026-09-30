'use client';

import { useEffect, useRef, useState } from 'react';
import type { DashboardState } from '@/lib/dashboard/types';
import { compressState, estimateShareSize, stripDataForShare } from '@/lib/dashboard/share';

interface Props {
  state: DashboardState;
  onClose: () => void;
}

export default function ShareLinkModal({ state, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripped, setStripped] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SIZE_LIMIT = 200_000;
    const isLarge = estimateShareSize(state) > SIZE_LIMIT;
    const stateToShare = isLarge ? stripDataForShare(state) : state;
    setStripped(isLarge);
    compressState(stateToShare)
      .then((compressed) => {
        setUrl(`${window.location.origin}/dashboard/view?d=${compressed}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [state]);

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Share dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Anyone with this link can view in read-only mode</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Generating link…
            </div>
          ) : !url ? (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              Could not generate link. Try downloading as a file instead.
            </p>
          ) : (
            <>
              {/* URL display */}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={url}
                  onFocus={() => inputRef.current?.select()}
                  className="flex-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400 select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-900 hover:bg-slate-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                        <path d="M3 8l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                        <rect x="5" y="5" width="9" height="9" rx="1.5" />
                        <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              {stripped && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  This dashboard is large — dataset rows were excluded from the link. Recipients will see the layout and charts, but no underlying data.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
