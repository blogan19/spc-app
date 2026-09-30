'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DashboardState } from '@/lib/dashboard/types';
import { decompressState } from '@/lib/dashboard/share';
import TileGrid from '@/app/dashboard/TileGrid';
import DashboardHeader from '@/app/dashboard/DashboardHeader';

// Parses common date formats used in NHS datasets:
// ISO (2024-01-15), Mon YYYY (Jan 2024), DD/MM/YYYY, DD-MM-YYYY
function parseFlexDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T00:00:00');

  const monYear = str.match(/^([A-Za-z]{3,})[\s\-](\d{2,4})$/);
  if (monYear) {
    const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mi = MONTHS.indexOf(monYear[1].slice(0, 3).toLowerCase());
    if (mi >= 0) {
      let yr = parseInt(monYear[2], 10);
      if (yr < 100) yr += 2000;
      return new Date(yr, mi, 1);
    }
  }

  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    let yr = parseInt(dmy[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }

  const dmyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dmyDash) {
    let yr = parseInt(dmyDash[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, parseInt(dmyDash[2], 10) - 1, parseInt(dmyDash[1], 10));
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function applyDateFilter(state: DashboardState, from: string, to: string): DashboardState {
  if (!from && !to) return state;

  // Set end-of-day on `to` so the chosen day is included
  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T23:59:59') : null;

  const inRange = (d: Date | null) => {
    if (!d || isNaN(d.getTime())) return true;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  // Filter dataset rows by the first date-typed column
  const filteredDatasets = state.datasets.map((ds) => {
    const dateCol = ds.columns.find((c) => (c.typeOverride ?? c.type) === 'date');
    if (!dateCol) return ds;
    return {
      ...ds,
      rows: ds.rows.filter((row) => inRange(parseFlexDate(String(row[dateCol.name] ?? '')))),
    };
  });

  // Filter SPC / run chart measure data by ISO date field
  const filteredCharts = state.charts.map((chart) => {
    if (chart.type !== 'spc' && chart.type !== 'run') return chart;
    const cfg = chart.config as { measure: { data: Array<{ date: string }> } };
    if (!cfg.measure?.data) return chart;
    return {
      ...chart,
      config: {
        ...chart.config,
        measure: {
          ...cfg.measure,
          data: cfg.measure.data.filter((row) => inRange(parseFlexDate(row.date))),
        },
      },
    } as typeof chart;
  });

  return { ...state, datasets: filteredDatasets, charts: filteredCharts };
}

function ReadOnlyDashboard() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const filteredState = useMemo(
    () => (state ? applyDateFilter(state, dateFrom, dateTo) : null),
    [state, dateFrom, dateTo],
  );

  const hasFilterableData = useMemo(() => {
    if (!state) return false;
    const hasDateCol = state.datasets.some((ds) =>
      ds.columns.some((c) => (c.typeOverride ?? c.type) === 'date'),
    );
    const hasSpcData = state.charts.some(
      (c) =>
        (c.type === 'spc' || c.type === 'run') &&
        (c.config as { measure: { data: unknown[] } }).measure?.data?.length > 0,
    );
    return hasDateCol || hasSpcData;
  }, [state]);

  const filterActive = !!(dateFrom || dateTo);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (error || !filteredState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <p className="text-slate-800 font-semibold mb-2">Unable to load dashboard</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const hasNoData =
    filteredState.datasets.every((d) => d.rows.length === 0) &&
    filteredState.datasets.length > 0;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor:
          filteredState.dashboard.theme.background === 'dark'
            ? '#0f172a'
            : filteredState.dashboard.theme.background === 'lightGrey'
              ? '#f1f5f9'
              : '#f8fafc',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm flex flex-col flex-shrink-0">
        {!filteredState.dashboard.header?.enabled && (
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        )}
        {filteredState.dashboard.header?.enabled ? (
          <DashboardHeader header={filteredState.dashboard.header} />
        ) : (
          <div className="px-5 py-3 flex items-center gap-4 bg-gradient-to-r from-indigo-50/60 to-transparent">
            <span className="text-indigo-700 font-bold text-sm tracking-tight flex-shrink-0">NHS</span>
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate flex-1">
              {filteredState.dashboard.title || 'Shared Dashboard'}
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full flex-shrink-0">
              Read-only view
            </span>
          </div>
        )}
      </div>

      {/* Date filter bar */}
      {hasFilterableData && (
        <div className="sticky top-[53px] z-30 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-2.5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-slate-400">
              <rect x="1" y="3" width="14" height="11" rx="1.5" />
              <path d="M5 1v4M11 1v4M1 7h14" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-medium text-slate-600">Date range</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter from date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter to date"
            />
            {filterActive && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {filterActive && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-medium">
              Filter active
            </span>
          )}
          <span className="text-xs text-slate-400 hidden sm:block">
            · Click any chart to view its data table · Click a data point to drill through
          </span>
        </div>
      )}

      {hasNoData && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          This shared link was created without data — only the dashboard layout is shown.
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">
        {filteredState.dashboard.tiles.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            This dashboard has no tiles.
          </div>
        ) : (
          <TileGrid
            state={filteredState}
            datasets={filteredState.datasets}
            theme={filteredState.dashboard.theme}
            ragRules={filteredState.ragRules ?? []}
            annotations={filteredState.annotations ?? []}
            dashboardTitle={filteredState.dashboard.title}
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

      {!hasFilterableData && (
        <p className="text-center text-xs text-slate-400 py-4">
          Hover a chart for export options · Click to view data table where available
        </p>
      )}

      <footer className="bg-white border-t border-slate-100 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">SPC Dashboard</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs text-slate-400">Statistical Process Control for Quality Improvement</span>
          </div>
          <span className="text-xs text-slate-300">NHS Making Data Count</span>
        </div>
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      </footer>
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
