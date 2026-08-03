'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DashboardState } from '@/lib/dashboard/types';
import { decompressState } from '@/lib/dashboard/share';
import TileGrid from '@/app/dashboard/TileGrid';

function ReadOnlyDashboard() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = searchParams.get('d');
    if (!d) {
      setError('No dashboard data found in this link.');
      setLoading(false);
      return;
    }
    decompressState(d)
      .then((s) => { setState(s); setLoading(false); })
      .catch(() => {
        setError('This link could not be decoded. It may be corrupted or from an older version.');
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <p className="text-slate-800 font-semibold mb-2">Unable to load dashboard</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const hasNoData = state.datasets.every((d) => d.rows.length === 0) && state.datasets.length > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: state.dashboard.theme.background === 'dark' ? '#0f172a' : state.dashboard.theme.background === 'lightGrey' ? '#f1f5f9' : '#f8fafc' }}>
      {/* Read-only banner */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4">
        <span className="text-[#003087] font-bold text-sm tracking-tight flex-shrink-0">NHS</span>
        <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-800 truncate flex-1">
          {state.dashboard.title || 'Shared Dashboard'}
        </span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full flex-shrink-0">
          Read-only view
        </span>
      </div>

      {hasNoData && (
        <div className="mx-4 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          This shared link was created without data — only the dashboard layout is shown.
        </div>
      )}

      <main className="p-4">
        {state.dashboard.tiles.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            This dashboard has no tiles.
          </div>
        ) : (
          <TileGrid
            state={state}
            datasets={state.datasets}
            theme={state.dashboard.theme}
            ragRules={state.ragRules ?? []}
            annotations={state.annotations ?? []}
            dashboardTitle={state.dashboard.title}
            onAddTile={() => {}}
            onLayoutChange={() => {}}
            onTileClick={() => {}}
            onDeleteTile={() => {}}
            onDuplicateTile={() => {}}
            onDetailsTile={() => {}}
            readOnly
          />
        )}
      </main>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    }>
      <ReadOnlyDashboard />
    </Suspense>
  );
}
