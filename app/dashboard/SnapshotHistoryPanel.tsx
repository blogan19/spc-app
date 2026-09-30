'use client';

import type { SnapshotMeta } from '@/lib/dashboard/io';

interface SnapshotHistoryPanelProps {
  snapshots: SnapshotMeta[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function redownload(snap: SnapshotMeta) {
  const blob = new Blob([snap.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${snap.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.snapshot.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SnapshotHistoryPanel({ snapshots, onDelete, onClose }: SnapshotHistoryPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-white shadow-2xl flex flex-col border-l border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Snapshot history</h2>
          <p className="text-xs text-gray-500 mt-0.5">Snapshots taken this session</p>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <p className="text-sm text-gray-400 mb-1">No snapshots yet</p>
            <p className="text-xs text-gray-400">Use &ldquo;Take snapshot&rdquo; in the toolbar to freeze the dashboard</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {[...snapshots].reverse().map((snap) => (
              <li key={snap.id} className="px-5 py-4 hover:bg-gray-50 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{snap.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(snap.takenAt)}</p>
                    {snap.notes && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{snap.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => redownload(snap)}
                      title="Re-download snapshot"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path d="M8 2v8m0 0L5 7m3 3 3-3M2 13h12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete snapshot "${snap.name}"?`)) onDelete(snap.id);
                      }}
                      title="Delete snapshot"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                        <path d="M2 4h12M6 4V2h4v2M5 4l1 10h4l1-10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Snapshots are stored for this session only. Download to keep them permanently.
        </p>
      </div>
    </div>
  );
}
