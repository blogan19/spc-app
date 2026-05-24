'use client'
// Incidents tab. Reads the imported IncidentDataset and shows:
//  - summary stats (count, by severity)
//  - Pareto bars by type
//  - Pareto bars by location
//  - type × location co-occurrence heatmap
//
// The component is read-only (no incident editing); the lifecycle stays
// in the trust's LRMS per plan §7.

import { useMemo, useState } from 'react';
import IncidentImportDialog from './IncidentImportDialog';
import FunnelChart from './FunnelChart';
import {
  countByLocation,
  countBySeverity,
  countByType,
  incidentCountsAroundDate,
  timeOfDayByDayOfWeekMatrix,
  typeByLocationMatrix,
  type NamedCount,
} from '@/lib/project/incidents';
import {
  clusterIncidentNarratives,
  type ThemesAnalysis,
} from '@/lib/project/narrativeThemes';
import type {
  Incident,
  IncidentSeverity,
  PDSACycle,
  Project,
} from '@/lib/project/types';

interface Props {
  project: Project;
  onSetIncidents: (incidents: Incident[]) => void;
  onClear: () => void;
  onSetLocationDenominator: (location: string, denominator: number | undefined) => void;
}

interface IncidentFilter {
  type?: string;
  location?: string;
}

export default function IncidentsView({
  project,
  onSetIncidents,
  onClear,
  onSetLocationDenominator,
}: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<IncidentFilter>({});
  const [themesK, setThemesK] = useState(4);
  const dataset = project.incidentDataset;
  const incidents = useMemo(() => dataset?.incidents ?? [], [dataset]);

  // Drill-through: each panel applies the filters *except* the one it
  // owns — so the type Pareto stays informative when a type filter is
  // active (the active bar is highlighted, the rest of the type
  // distribution is still visible).
  const matchType = (i: Incident) => !filter.type || i.type === filter.type;
  const matchLocation = (i: Incident) =>
    !filter.location || i.location === filter.location;

  const incidentsForTypeChart = useMemo(
    () => incidents.filter(matchLocation),
    [incidents, filter.location],
  );
  const incidentsForLocationChart = useMemo(
    () => incidents.filter(matchType),
    [incidents, filter.type],
  );
  const filteredIncidents = useMemo(
    () => incidents.filter((i) => matchType(i) && matchLocation(i)),
    [incidents, filter.type, filter.location],
  );

  const types = useMemo(() => countByType(incidentsForTypeChart), [incidentsForTypeChart]);
  const locations = useMemo(
    () => countByLocation(incidentsForLocationChart),
    [incidentsForLocationChart],
  );
  const severities = useMemo(
    () => countBySeverity(filteredIncidents),
    [filteredIncidents],
  );
  const matrix = useMemo(() => typeByLocationMatrix(filteredIncidents), [filteredIncidents]);
  const timeMatrix = useMemo(
    () => timeOfDayByDayOfWeekMatrix(filteredIncidents),
    [filteredIncidents],
  );
  const themes = useMemo(
    () => clusterIncidentNarratives(filteredIncidents, { k: themesK }),
    [filteredIncidents, themesK],
  );
  const startedCycles = useMemo(
    () => project.pdsaCycles.filter((c) => c.startDate),
    [project.pdsaCycles],
  );

  const toggleFilter = (dim: 'type' | 'location', value: string) =>
    setFilter((f) => ({ ...f, [dim]: f[dim] === value ? undefined : value }));
  const clearFilter = (dim: 'type' | 'location') =>
    setFilter((f) => ({ ...f, [dim]: undefined }));
  const clearAllFilters = () => setFilter({});

  if (!dataset || incidents.length === 0) {
    return (
      <>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-base font-medium text-gray-900 mb-1">
            No incident data yet
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Import an LFPSE / LRMS export to see Pareto bars by type and location, plus a
            type-by-location heatmap to surface clusters. The dataset is read-only — the app
            consumes it for analysis, it doesn't manage the lifecycle.
          </p>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Import incidents…
          </button>
        </div>
        <IncidentImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={onSetIncidents}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-gray-900">
            {incidents.length.toLocaleString()} incidents
          </h2>
          <p className="text-xs text-gray-500">
            Imported {new Date(dataset.importedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Replace dataset…
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear the imported incident dataset?')) onClear();
            }}
            className="text-sm px-3 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
          >
            Clear
          </button>
        </div>
      </header>

      <ActiveFilters
        filter={filter}
        filteredCount={filteredIncidents.length}
        totalCount={incidents.length}
        onClearOne={clearFilter}
        onClearAll={clearAllFilters}
      />

      <SeverityStrip
        severities={severities}
        total={filteredIncidents.length || 1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParetoPanel
          title="Top incident types"
          data={types}
          accent="#dc2626"
          selected={filter.type}
          onSelect={(name) => toggleFilter('type', name)}
        />
        <ParetoPanel
          title="Top locations"
          data={locations}
          accent="#2563eb"
          selected={filter.location}
          onSelect={(name) => toggleFilter('location', name)}
        />
      </div>

      <HeatmapPanel matrix={matrix} />

      {timeMatrix.parsedRowCount > 0 && (
        <TimeOfDayHeatmap matrix={timeMatrix} />
      )}

      <ThemesPanel themes={themes} k={themesK} onChangeK={setThemesK} />

      <LocationDenominators
        incidents={incidents}
        denominators={dataset.locationDenominators ?? {}}
        onSet={onSetLocationDenominator}
      />

      <IncidentFunnelPanel
        filteredIncidents={filteredIncidents}
        denominators={dataset.locationDenominators ?? {}}
        filter={filter}
      />

      {startedCycles.length > 0 && (
        <PdsaBeforeAfterPanel cycles={startedCycles} incidents={filteredIncidents} />
      )}

      <IncidentImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={onSetIncidents}
      />
    </div>
  );
}

// --- Severity strip ------------------------------------------------------

const severityColours: Record<IncidentSeverity, { bg: string; label: string }> = {
  'no-harm': { bg: 'bg-gray-300', label: 'No harm' },
  low: { bg: 'bg-yellow-300', label: 'Low' },
  moderate: { bg: 'bg-orange-400', label: 'Moderate' },
  severe: { bg: 'bg-red-500', label: 'Severe' },
  death: { bg: 'bg-red-900', label: 'Death' },
  unknown: { bg: 'bg-gray-200', label: 'Unknown' },
};

function SeverityStrip({
  severities,
  total,
}: {
  severities: Array<{ severity: IncidentSeverity; count: number }>;
  total: number;
}) {
  if (severities.length === 0 || total === 0) return null;
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1">By severity</h3>
      <div className="flex h-4 rounded overflow-hidden border border-gray-200">
        {severities.map(({ severity, count }) => (
          <div
            key={severity}
            className={severityColours[severity].bg}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${severityColours[severity].label}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
        {severities.map(({ severity, count }) => (
          <span key={severity} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm ${severityColours[severity].bg}`} />
            {severityColours[severity].label}: <strong>{count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Pareto panel (HTML bars) -------------------------------------------

function ParetoPanel({
  title,
  data,
  accent,
  selected,
  onSelect,
}: {
  title: string;
  data: NamedCount[];
  accent: string;
  selected?: string;
  onSelect?: (name: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const shown = data.slice(0, 10);
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {onSelect && (
          <span className="text-[10px] uppercase tracking-wide text-gray-400">
            Click a bar to filter
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {shown.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const barPct = max > 0 ? (d.count / max) * 100 : 0;
          const isSelected = selected === d.name;
          const isDimmed = selected !== undefined && !isSelected;
          return (
            <li key={d.name} className="text-sm">
              <button
                type="button"
                onClick={() => onSelect?.(d.name)}
                className={`flex items-center gap-2 w-full text-left rounded px-1 py-0.5 ${
                  onSelect ? 'hover:bg-gray-50 cursor-pointer' : ''
                } ${isSelected ? 'bg-gray-100' : ''}`}
                disabled={!onSelect}
              >
                <span
                  className={`w-36 truncate ${
                    isSelected ? 'font-semibold text-gray-900' : ''
                  }`}
                  title={d.name}
                >
                  {d.name}
                </span>
                <div className="flex-1 bg-gray-100 h-4 rounded">
                  <div
                    className="h-full rounded transition-opacity"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: accent,
                      opacity: isDimmed ? 0.35 : 1,
                    }}
                  />
                </div>
                <span className="w-20 text-right text-xs text-gray-600 tabular-nums">
                  {d.count}{' '}
                  <span className="text-gray-400">({pct.toFixed(1)}%)</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {data.length > shown.length && (
        <p className="text-xs text-gray-500 mt-2">
          Showing top 10 of {data.length} categories.
        </p>
      )}
    </section>
  );
}

function ActiveFilters({
  filter,
  filteredCount,
  totalCount,
  onClearOne,
  onClearAll,
}: {
  filter: IncidentFilter;
  filteredCount: number;
  totalCount: number;
  onClearOne: (dim: 'type' | 'location') => void;
  onClearAll: () => void;
}) {
  const active = (['type', 'location'] as const).filter((k) => filter[k]);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
      <span className="text-blue-900 font-medium">
        Showing {filteredCount} of {totalCount}
      </span>
      {active.map((dim) => (
        <span
          key={dim}
          className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2 py-0.5 text-xs"
        >
          <span className="uppercase tracking-wide text-blue-700">{dim}:</span>
          <span className="text-gray-900">{filter[dim]}</span>
          <button
            type="button"
            onClick={() => onClearOne(dim)}
            className="text-gray-500 hover:text-red-600 ml-1"
            title="Clear this filter"
          >
            ✕
          </button>
        </span>
      ))}
      {active.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-blue-700 hover:underline ml-auto"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// --- Heatmap -------------------------------------------------------------

function HeatmapPanel({
  matrix,
}: {
  matrix: ReturnType<typeof typeByLocationMatrix>;
}) {
  const maxRows = 15;
  const maxCols = 12;
  const rows = matrix.rows.slice(0, maxRows);
  const cols = matrix.cols.slice(0, maxCols);
  const truncated = matrix.rows.length > maxRows || matrix.cols.length > maxCols;

  if (rows.length === 0 || cols.length === 0) {
    return null;
  }

  const cellSize = 32;
  const labelW = 160;
  const colHeaderH = 90;
  const svgWidth = labelW + cols.length * cellSize + 20;
  const svgHeight = colHeaderH + rows.length * cellSize + 20;

  const colour = (count: number) => {
    if (count === 0) return '#ffffff';
    const t = matrix.max > 0 ? count / matrix.max : 0;
    // Linear interpolate light-blue → dark-blue
    const r = Math.round(220 - 190 * t);
    const g = Math.round(235 - 170 * t);
    const b = Math.round(252 - 110 * t);
    return `rgb(${r},${g},${b})`;
  };
  const fontColour = (count: number) =>
    matrix.max > 0 && count / matrix.max > 0.55 ? 'white' : '#1f2937';

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        Type × location heatmap
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Cells show incident counts. Darker = higher concentration. Rows and columns are
        sorted by total — top-left is where most signal sits.
      </p>
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Column headers, rotated for readability when names are long. */}
        {cols.map((col, j) => {
          const x = labelW + j * cellSize + cellSize / 2;
          return (
            <text
              key={col}
              x={x}
              y={colHeaderH - 6}
              textAnchor="start"
              fontSize={11}
              fill="#374151"
              transform={`rotate(-50 ${x} ${colHeaderH - 6})`}
            >
              {truncate(col, 18)}
            </text>
          );
        })}
        {/* Rows */}
        {rows.map((row, i) => {
          const y = colHeaderH + i * cellSize;
          return (
            <g key={row}>
              <text
                x={labelW - 8}
                y={y + cellSize / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#374151"
              >
                {truncate(row, 22)}
              </text>
              {cols.map((col, j) => {
                const count = matrix.counts[i][j];
                const x = labelW + j * cellSize;
                return (
                  <g key={col}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      fill={colour(count)}
                      stroke="#e5e7eb"
                    />
                    {count > 0 && (
                      <text
                        x={x + cellSize / 2}
                        y={y + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fill={fontColour(count)}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {truncated && (
        <p className="text-xs text-gray-500 mt-2">
          Showing top {maxRows} types × top {maxCols} locations. Clusters in the tail are
          visible in the underlying data.
        </p>
      )}
    </section>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --- Time-of-day × day-of-week heatmap ----------------------------------

function TimeOfDayHeatmap({
  matrix,
}: {
  matrix: ReturnType<typeof timeOfDayByDayOfWeekMatrix>;
}) {
  const cellW = 26;
  const cellH = 24;
  const labelW = 50;
  const colHeaderH = 22;
  const svgWidth = labelW + matrix.cols.length * cellW + 12;
  const svgHeight = colHeaderH + matrix.rows.length * cellH + 12;

  const colour = (count: number) => {
    if (count === 0) return '#ffffff';
    const t = matrix.max > 0 ? count / matrix.max : 0;
    const r = Math.round(220 - 190 * t);
    const g = Math.round(235 - 170 * t);
    const b = Math.round(252 - 110 * t);
    return `rgb(${r},${g},${b})`;
  };
  const fontColour = (count: number) =>
    matrix.max > 0 && count / matrix.max > 0.55 ? 'white' : '#1f2937';

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        Time-of-day × day-of-week heatmap
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Hours of the day across, days of the week down. Surfaces handover, shift and
        weekend effects.{' '}
        {matrix.unparsedRowCount > 0 && (
          <span className="text-amber-700">
            ({matrix.unparsedRowCount} rows had unparseable datetimes and are excluded.)
          </span>
        )}
      </p>
      <svg width={svgWidth} height={svgHeight} className="block">
        {/* Hour column headers */}
        {matrix.cols.map((col, j) => (
          <text
            key={col}
            x={labelW + j * cellW + cellW / 2}
            y={colHeaderH - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
          >
            {col}
          </text>
        ))}
        {/* Day rows */}
        {matrix.rows.map((row, i) => {
          const y = colHeaderH + i * cellH;
          return (
            <g key={row}>
              <text
                x={labelW - 6}
                y={y + cellH / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#374151"
              >
                {row}
              </text>
              {matrix.cols.map((col, j) => {
                const count = matrix.counts[i][j];
                const x = labelW + j * cellW;
                return (
                  <g key={col}>
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      fill={colour(count)}
                      stroke="#e5e7eb"
                    />
                    {count > 0 && (
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fill={fontColour(count)}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

// --- PDSA before/after panel --------------------------------------------

function PdsaBeforeAfterPanel({
  cycles,
  incidents,
}: {
  cycles: PDSACycle[];
  incidents: Incident[];
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-sm font-medium text-gray-900 mb-1">PDSA before/after</h3>
      <p className="text-xs text-gray-500 mb-3">
        Incident counts in equal-duration windows before and after each PDSA's start
        date. Down is good — fewer incidents after the change suggests it's helping,
        though small samples may not be conclusive.
      </p>
      <ul className="space-y-2">
        {cycles.map((cycle) => (
          <li key={cycle.id}>
            <BeforeAfterRow cycle={cycle} incidents={incidents} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BeforeAfterRow({
  cycle,
  incidents,
}: {
  cycle: PDSACycle;
  incidents: Incident[];
}) {
  const result = incidentCountsAroundDate(incidents, cycle.startDate);
  if (!result) {
    return (
      <div className="text-sm text-gray-500 border-l-2 border-gray-200 pl-3">
        <span className="font-medium text-gray-700">{cycle.title}</span> — start date is
        invalid or in the future, can't compare yet.
      </div>
    );
  }
  const { before, after, windowDays, beforeWindow, afterWindow } = result;
  const trend = trendFor(before, after);
  const summary = formatSummary(before, after, windowDays);

  return (
    <div className="border-l-2 border-gray-200 pl-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-gray-900">{cycle.title}</span>{' '}
          <span className="text-xs text-gray-500">started {cycle.startDate}</span>
        </div>
        <TrendBadge trend={trend} />
      </div>
      <div className="flex items-stretch gap-3 mt-1 text-xs">
        <WindowBox label={`${windowDays}d before`} window={beforeWindow} count={before} />
        <WindowBox label={`${windowDays}d after`} window={afterWindow} count={after} />
      </div>
      <p className="text-xs text-gray-600 mt-1">{summary}</p>
    </div>
  );
}

function WindowBox({
  label,
  window,
  count,
}: {
  label: string;
  window: { start: string; end: string };
  count: number;
}) {
  return (
    <div className="flex-1 border border-gray-200 rounded p-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xs text-gray-500">
        {window.start} → {window.end}
      </div>
      <div className="text-lg font-semibold text-gray-900 tabular-nums">{count}</div>
    </div>
  );
}

type Trend = 'down' | 'up' | 'flat' | 'no-baseline';

function trendFor(before: number, after: number): Trend {
  if (before === 0 && after === 0) return 'flat';
  if (before === 0) return 'no-baseline';
  if (after < before) return 'down';
  if (after > before) return 'up';
  return 'flat';
}

function formatSummary(before: number, after: number, windowDays: number): string {
  if (before === 0 && after === 0) {
    return `No incidents recorded in either ${windowDays}-day window.`;
  }
  if (before === 0) {
    return `No baseline — ${after} incident${after === 1 ? '' : 's'} since the change, with nothing recorded in the matching window before.`;
  }
  const deltaPct = ((after - before) / before) * 100;
  const sign = deltaPct >= 0 ? '+' : '';
  return `${before} before vs ${after} after over ${windowDays} days (${sign}${deltaPct.toFixed(0)}%).`;
}

// --- Themes panel -------------------------------------------------------

function ThemesPanel({
  themes,
  k,
  onChangeK,
}: {
  themes: ThemesAnalysis;
  k: number;
  onChangeK: (k: number) => void;
}) {
  if (themes.contributingCount === 0) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Themes from narratives
        </h3>
        <p>
          No incident descriptions to cluster yet. Map a free-text/narrative column on
          import to surface recurring themes here.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <header className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Themes from narratives
          </h3>
          <p className="text-xs text-gray-500">
            Unsupervised clustering of the free-text descriptions. Top terms are the words
            that distinguish each cluster — they're the bones of the theme. Local
            analysis (TF-IDF + cosine k-means); nothing leaves your machine.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
          Clusters
          <input
            type="number"
            min={1}
            max={8}
            value={k}
            onChange={(e) => onChangeK(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm"
          />
        </label>
      </header>

      <p className="text-xs text-gray-500 mb-2">
        {themes.contributingCount} narrative
        {themes.contributingCount === 1 ? '' : 's'} clustered into {themes.effectiveK}{' '}
        theme{themes.effectiveK === 1 ? '' : 's'}
        {themes.effectiveK < k &&
          ` (capped at floor(n/2) — request was ${k})`}
        {themes.skippedCount > 0 &&
          `. ${themes.skippedCount} skipped (no usable text after removing common stop words).`}
      </p>

      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {themes.clusters.map((cluster) => (
          <li
            key={cluster.id}
            className="border border-gray-200 rounded p-3 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Theme {cluster.id + 1}
              </span>
              <span className="text-xs text-gray-600">
                {cluster.size} incident{cluster.size === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {cluster.topTerms.map((t) => (
                <span
                  key={t.term}
                  className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-800"
                  title={`weight ${t.weight.toFixed(3)}`}
                >
                  {t.term}
                </span>
              ))}
            </div>
            <ul className="space-y-1">
              {cluster.representatives.map((r) => (
                <li
                  key={r.id}
                  className="text-xs text-gray-700 border-l-2 border-gray-300 pl-2 italic"
                  title={`similarity ${r.similarity.toFixed(2)}`}
                >
                  {truncate(r.text, 220)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Location denominators editor ---------------------------------------

function LocationDenominators({
  incidents,
  denominators,
  onSet,
}: {
  incidents: Incident[];
  denominators: Record<string, number>;
  onSet: (location: string, denominator: number | undefined) => void;
}) {
  const rows = useMemo(() => {
    const counts = countByLocation(incidents);
    return counts;
  }, [incidents]);

  if (rows.length === 0) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-sm font-medium text-gray-900 mb-1">
        Exposure denominators by location
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Enter an exposure (e.g. bed-days, attendances, occupied-bed-days) for each location
        so rates can be compared fairly on the funnel below. Leave blank to omit a location.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-2 border border-gray-200 rounded p-2 text-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-gray-900" title={r.name}>
                {r.name}
              </div>
              <div className="text-xs text-gray-500">
                {r.count} incident{r.count === 1 ? '' : 's'}
              </div>
            </div>
            <input
              type="number"
              defaultValue={denominators[r.name] ?? ''}
              placeholder="—"
              min={0}
              onBlur={(e) => {
                const v = e.target.value;
                onSet(r.name, v === '' ? undefined : Number(v));
              }}
              className="w-24 border border-gray-300 rounded px-1 py-0.5 text-sm tabular-nums"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Exposure-adjusted funnel panel -------------------------------------

function IncidentFunnelPanel({
  filteredIncidents,
  denominators,
  filter,
}: {
  filteredIncidents: Incident[];
  denominators: Record<string, number>;
  filter: IncidentFilter;
}) {
  // Only meaningful with at least two locations with positive denominators.
  const data = useMemo(() => {
    const counts = countByLocation(filteredIncidents);
    return counts
      .map((c) => ({
        date: c.name,
        value: c.count,
        denominator: denominators[c.name],
      }))
      .filter((d) => typeof d.denominator === 'number' && d.denominator > 0);
  }, [filteredIncidents, denominators]);

  if (filter.location) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Exposure-adjusted funnel
        </h3>
        <p>
          Funnel comparison is hidden while a location filter is active — clear the{' '}
          <span className="font-mono">location</span> filter to see all wards.
        </p>
      </section>
    );
  }

  if (data.length < 2) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Exposure-adjusted funnel
        </h3>
        <p>
          Fill in denominators for at least two locations above to compare incident rates on
          a funnel plot. The funnel accounts for natural variation: small wards have wider
          limits because small samples wobble more.
        </p>
      </section>
    );
  }

  const params = {
    data,
    width: 720,
    height: 400,
    marginTop: 50,
    marginBottom: 60,
    marginLeft: 60,
    marginRight: 40,
    title: filter.type
      ? `Incident rate by location — ${filter.type}`
      : 'Incident rate by location',
    titleSize: 14,
    xAxisLabel: 'Exposure (denominator)',
    yAxisLabel: 'Incident rate',
    lineColor: '#2563eb',
    lineWidth: 1.5,
    confColor: '#9ca3af',
    confWidth: 1,
    defaultPointColor: '#3b82f6',
    outlierColor: '#dc2626',
    outlierStatus: true,
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-sm font-medium text-gray-900 mb-1">
        Exposure-adjusted funnel
      </h3>
      <p className="text-xs text-gray-500 mb-2">
        Locations outside the funnel have rates statistically different from the pooled
        average, given their exposure. Use this rather than ranking raw rates — a tiny
        ward at the top of a league table may just be unlucky.
      </p>
      <FunnelChart params={params} />
    </section>
  );
}

function TrendBadge({ trend }: { trend: Trend }) {
  const map: Record<Trend, { label: string; bg: string; text: string }> = {
    down: { label: '↓ Improvement', bg: 'bg-blue-100', text: 'text-blue-800' },
    up: { label: '↑ Concerning', bg: 'bg-orange-100', text: 'text-orange-800' },
    flat: { label: '— No change', bg: 'bg-gray-100', text: 'text-gray-700' },
    'no-baseline': {
      label: '? No baseline',
      bg: 'bg-gray-100',
      text: 'text-gray-600',
    },
  };
  const m = map[trend];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}
