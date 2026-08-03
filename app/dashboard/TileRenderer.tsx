'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  ChartConfig,
  KpiTileConfig,
  SpcTileConfig,
  TextTileConfig,
  BarTileConfig,
  LineTileConfig,
  DataTableTileConfig,
  ImageTileConfig,
  RunTileConfig,
  ParetoTileConfig,
  HeatmapTileConfig,
  PieTileConfig,
  AreaTileConfig,
  ScatterTileConfig,
  FunnelTileConfig,
  GanttTileConfig,
  WaterfallTileConfig,
  PyramidTileConfig,
  BoxPlotTileConfig,
  CalendarHeatmapTileConfig,
  TitleTileConfig,
  SectionTileConfig,
  ScorecardTileConfig,
  DashboardTile,
  DashboardTheme,
  Dataset,
  RagRule,
  AnnotationDef,
} from '@/lib/dashboard/types';
import { analysePareto, type ParetoInputCategory } from '@/lib/spc/pareto';
import DashParetoChart from './charts/DashParetoChart';
import DashFunnelChart from './charts/DashFunnelChart';
import { analyseFunnel, type FunnelInputUnit } from '@/lib/spc/funnel';
import DashGanttChart, { type GanttTask } from './charts/DashGanttChart';
import DashWaterfallChart, { type WaterfallBar } from './charts/DashWaterfallChart';
import DashPyramidChart, { type PyramidRow } from './charts/DashPyramidChart';
import DashBoxPlotChart, { type BoxGroup } from './charts/DashBoxPlotChart';
import DashCalendarHeatmap, { type CalendarDay } from './charts/DashCalendarHeatmap';
import DashHeatmapChart, { type HeatmapData } from './charts/DashHeatmapChart';
import DashScorecardChart from './charts/DashScorecardChart';
import DashPieChart from './charts/DashPieChart';
import DashAreaChart from './charts/DashAreaChart';
import DashScatterChart from './charts/DashScatterChart';
import { evaluateRag, RAG_BG, RAG_BADGE, RAG_LABEL } from '@/lib/dashboard/rag';
import type { Measure } from '@/lib/project/types';
import LineChart from '@/app/spc/spc';
import BarChart from './charts/BarChart';
import DashLineChart from './charts/DashLineChart';
import DataTable from './charts/DataTable';
import { paletteColors } from '@/lib/dashboard/seed';
import ChartDataTable, { hasTableView } from './ChartDataTable';
import TileExportMenu from './TileExportMenu';
import DrillThroughModal from './DrillThroughModal';
import { applyDateGrouping } from '@/lib/dashboard/financialYear';

interface TileRendererProps {
  tile: DashboardTile;
  chart: ChartConfig;
  datasets: Dataset[];
  theme: DashboardTheme;
  ragRules: RagRule[];
  annotations: AnnotationDef[];
  dashboardTitle: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDetails: () => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

function getFreshnessDate(chart: ChartConfig, datasets: Dataset[]): Date | null {
  if (chart.type === 'spc') {
    const measure = (chart.config as SpcTileConfig).measure;
    if (!measure.data.length) return null;
    const lastDate = measure.data[measure.data.length - 1].date;
    const d = new Date(lastDate);
    return isNaN(d.getTime()) ? null : d;
  }
  if (chart.type === 'bar' || chart.type === 'line' || chart.type === 'table' || chart.type === 'run' || chart.type === 'pareto' || chart.type === 'heatmap' || chart.type === 'calendar' || chart.type === 'pie' || chart.type === 'area' || chart.type === 'scatter' || chart.type === 'funnel' || chart.type === 'gantt' || chart.type === 'waterfall' || chart.type === 'pyramid' || chart.type === 'boxplot' || chart.type === 'scorecard') {
    const dsId = (chart.config as BarTileConfig | LineTileConfig | DataTableTileConfig | RunTileConfig | ParetoTileConfig | HeatmapTileConfig | CalendarHeatmapTileConfig | PieTileConfig | AreaTileConfig | ScatterTileConfig | FunnelTileConfig | GanttTileConfig | WaterfallTileConfig | PyramidTileConfig | BoxPlotTileConfig | ScorecardTileConfig).datasetId;
    const ds = datasets.find((d) => d.id === dsId);
    if (!ds) return null;
    let best = new Date(ds.uploadedAt);
    for (const row of ds.rows) {
      const v = row['_appendedAt'];
      if (v) {
        const d = new Date(String(v));
        if (!isNaN(d.getTime()) && d > best) best = d;
      }
    }
    return best;
  }
  return null;
}

function formatFreshnessDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TileRenderer({ chart, datasets, theme, ragRules, annotations, dashboardTitle, onEdit, onDelete, onDuplicate, onDetails }: TileRendererProps) {
  const actions = chart.details?.actions ?? [];
  const overdueCount = actions.filter(
    (a) => a.status !== 'complete' && a.dueDate && a.dueDate < TODAY,
  ).length;
  const hasActions = actions.length > 0;

  const freshnessDate = getFreshnessDate(chart, datasets);
  const isStale = freshnessDate
    ? Date.now() - freshnessDate.getTime() > (theme.stalenessThresholdDays ?? 35) * 86400000
    : false;

  const [showTable, setShowTable] = useState(false);
  const canShowTable = hasTableView(chart.type);
  const chartContentRef = useRef<HTMLDivElement>(null);

  const [drillFilter, setDrillFilter] = useState<{
    column: string;
    value: string;
    datasetId: string;
  } | null>(null);
  const drillDataset = drillFilter ? datasets.find((d) => d.id === drillFilter.datasetId) ?? null : null;

  return (
    <>
    <div
      className="relative h-full flex flex-col overflow-hidden group cursor-pointer"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}
      aria-label={`Edit ${chart.name}`}
    >
      {/* Drag handle bar — visible on hover */}
      <div
        className="drag-handle absolute inset-x-0 top-0 h-7 z-20 opacity-0 group-hover:opacity-100 transition-opacity
                   cursor-grab active:cursor-grabbing
                   bg-gradient-to-b from-black/5 to-transparent"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Hover controls */}
      <div
        className="absolute top-0.5 right-0.5 z-30 flex items-center gap-0.5
                   opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <TileExportMenu
          chart={chart}
          datasets={datasets}
          dashboardTitle={dashboardTitle}
          contentRef={chartContentRef}
        />
        <button
          type="button"
          onClick={onDetails}
          title="View details / actions"
          className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-400 hover:text-[#005EB8] shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicate tile"
          className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-400 hover:text-gray-600 shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Remove tile"
          className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-400 hover:text-red-500 shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Chart content area — flex-1, badges/hints positioned within */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {/* Action count badge — always visible when actions exist */}
        {hasActions && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDetails(); }}
            className={`absolute bottom-1.5 left-2 z-10 text-xs px-2 py-0.5 rounded-full font-medium
                        ${overdueCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}
                        hover:opacity-80 transition-opacity`}
          >
            {actions.length} action{actions.length !== 1 ? 's' : ''}
            {overdueCount > 0 && ` · ${overdueCount} overdue`}
          </button>
        )}

        {/* View-as-table toggle */}
        {canShowTable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTable((v) => !v); }}
            title={showTable ? 'View chart' : 'View as accessible data table'}
            aria-pressed={showTable}
            className={`absolute bottom-1 right-2 z-20 text-xs px-1.5 py-0.5 rounded border transition-colors shadow-sm
                       ${showTable
                         ? 'bg-[#005EB8] border-[#005EB8] text-white'
                         : 'bg-white/80 border-gray-200 text-gray-400 hover:text-[#005EB8] hover:border-[#005EB8]'}`}
          >
            {showTable ? '◀ Chart' : '⊞ Table'}
          </button>
        )}

        {/* Tile chart content */}
        <div ref={chartContentRef} className="absolute inset-0 overflow-hidden">
          {showTable && canShowTable ? (
            <ChartDataTable chart={chart} datasets={datasets} />
          ) : (
            <>
              {chart.type === 'spc' && (
                <SpcTileContent measure={(chart.config as SpcTileConfig).measure} />
              )}
              {chart.type === 'kpi' && (
                <KpiTileContent config={chart.config as KpiTileConfig} ragRules={ragRules} />
              )}
              {chart.type === 'text' && (
                <TextTileContent config={chart.config as TextTileConfig} />
              )}
              {chart.type === 'bar' && (
                <BarTileContent
                  chart={chart}
                  config={chart.config as BarTileConfig}
                  datasets={datasets}
                  theme={theme}
                  onDrillClick={(col, val) => setDrillFilter({ column: col, value: val, datasetId: (chart.config as BarTileConfig).datasetId })}
                />
              )}
              {chart.type === 'line' && (
                <LineTileContent
                  chart={chart}
                  config={chart.config as LineTileConfig}
                  datasets={datasets}
                  theme={theme}
                  annotations={annotations.filter((a) => ((chart.config as LineTileConfig).annotationIds ?? []).includes(a.id))}
                  onDrillClick={(val) => setDrillFilter({ column: (chart.config as LineTileConfig).xColumn, value: val, datasetId: (chart.config as LineTileConfig).datasetId })}
                />
              )}
              {chart.type === 'table' && (
                <TableTileContent
                  config={chart.config as DataTableTileConfig}
                  datasets={datasets}
                />
              )}
              {chart.type === 'image' && (
                <ImageTileContent config={chart.config as ImageTileConfig} />
              )}
              {chart.type === 'run' && (
                <RunTileContent
                  config={chart.config as RunTileConfig}
                  datasets={datasets}
                  annotations={annotations.filter((a) => ((chart.config as RunTileConfig).annotationIds ?? []).includes(a.id))}
                />
              )}
              {chart.type === 'pareto' && (
                <ParetoTileContent
                  config={chart.config as ParetoTileConfig}
                  datasets={datasets}
                  theme={theme}
                  onDrillClick={(name) => setDrillFilter({ column: (chart.config as ParetoTileConfig).categoryColumn, value: name, datasetId: (chart.config as ParetoTileConfig).datasetId })}
                />
              )}
              {chart.type === 'heatmap' && (
                <HeatmapTileContent config={chart.config as HeatmapTileConfig} datasets={datasets} />
              )}
              {chart.type === 'pie' && (
                <PieTileContent
                  config={chart.config as PieTileConfig}
                  datasets={datasets}
                  theme={theme}
                  onDrillClick={(label) => setDrillFilter({ column: (chart.config as PieTileConfig).categoryColumn, value: label, datasetId: (chart.config as PieTileConfig).datasetId })}
                />
              )}
              {chart.type === 'area' && (
                <AreaTileContent config={chart.config as AreaTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'scatter' && (
                <ScatterTileContent config={chart.config as ScatterTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'funnel' && (
                <FunnelTileContent config={chart.config as FunnelTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'gantt' && (
                <GanttTileContent config={chart.config as GanttTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'waterfall' && (
                <WaterfallTileContent config={chart.config as WaterfallTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'pyramid' && (
                <PyramidTileContent config={chart.config as PyramidTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'boxplot' && (
                <BoxPlotTileContent config={chart.config as BoxPlotTileConfig} datasets={datasets} theme={theme} />
              )}
              {chart.type === 'calendar' && (
                <CalendarTileContent config={chart.config as CalendarHeatmapTileConfig} datasets={datasets} />
              )}
              {chart.type === 'title' && (
                <TitleTileContent config={chart.config as TitleTileConfig} />
              )}
              {chart.type === 'section' && (
                <SectionTileContent config={chart.config as SectionTileConfig} />
              )}
              {chart.type === 'scorecard' && (
                <ScorecardTileContent config={chart.config as ScorecardTileConfig} datasets={datasets} theme={theme} />
              )}
            </>
          )}
        </div>

        {/* Edit hint on hover — only when no table toggle occupies that corner */}
        {!canShowTable && (
          <div
            className="absolute bottom-1.5 right-2 z-10 text-xs text-gray-400
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          >
            Click to edit
          </div>
        )}
      </div>

      {/* Data freshness footer */}
      {freshnessDate && (
        <div
          className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 border-t pointer-events-none
                      ${isStale
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}
          style={{ fontSize: '10px', lineHeight: '16px' }}
        >
          {isStale && (
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 flex-shrink-0">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          )}
          Data as of {formatFreshnessDate(freshnessDate)}
          {isStale && ' — data may be out of date'}
        </div>
      )}
    </div>
    {drillFilter && drillDataset && (
      <DrillThroughModal
        dataset={drillDataset}
        filterColumn={drillFilter.column}
        filterValue={drillFilter.value}
        chartName={chart.name}
        onClose={() => setDrillFilter(null)}
      />
    )}
    </>
  );
}

function SpcTileContent({ measure }: { measure: Measure }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (measure.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No data — click to add data
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <LineChart
        params={{
          data: measure.data,
          aim: measure.aim,
          target: measure.target,
          chartKind: measure.chartKind,
          increment: measure.increment,
          ...measure.settings,
          width: dims.w,
          height: dims.h,
          marginTop: 36,
          marginBottom: measure.settings.xAxisLabel ? 64 : 44,
          marginLeft: 48,
          marginRight: 20,
          titleSize: 13,
          axisLabelSize: 10,
        }}
      />
    </div>
  );
}

function KpiTileContent({ config, ragRules }: { config: KpiTileConfig; ragRules: RagRule[] }) {
  const { label, value, unit, comparisonValue, comparisonLabel, higherIsBetter, ragRuleId } = config;

  const activeRule = ragRules.find((r) => r.id === ragRuleId) ?? null;
  const ragStatus = activeRule && value != null ? evaluateRag(value, activeRule) : null;

  let deltaEl: React.ReactNode = null;
  if (comparisonValue != null && value != null) {
    const diff = value - comparisonValue;
    const isGood = higherIsBetter !== false ? diff >= 0 : diff <= 0;
    deltaEl = (
      <p className={`text-sm font-medium mt-1.5 ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
        {diff >= 0 ? '▲' : '▼'} {comparisonLabel || 'Target'}: {comparisonValue}
        {unit}
      </p>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center h-full p-4 text-center transition-colors ${
        ragStatus ? RAG_BG[ragStatus] : ''
      }`}
    >
      {ragStatus && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${RAG_BADGE[ragStatus]}`} />
          {RAG_LABEL[ragStatus]}
        </span>
      )}
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>}
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-bold text-gray-900 tabular-nums">
          {value != null ? value.toLocaleString() : '—'}
        </span>
        {unit && <span className="text-2xl text-gray-400 font-normal">{unit}</span>}
      </div>
      {deltaEl}
    </div>
  );
}

function TextTileContent({ config }: { config: TextTileConfig }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {config.title && (
        <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-2">
          {config.title}
        </h3>
      )}
      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{config.content}</p>
    </div>
  );
}

function BarTileContent({
  chart,
  config,
  datasets,
  theme,
  onDrillClick,
}: {
  chart: ChartConfig;
  config: BarTileConfig;
  datasets: Dataset[];
  theme: DashboardTheme;
  onDrillClick?: (col: string, val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);

  if (!dataset) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Dataset not found — click to reconfigure
      </div>
    );
  }

  const effectiveColor = chart.themeOverride === null
    ? paletteColors(theme.palette, theme.customColours)[0] ?? config.color
    : config.color;

  const barData = config.dateGrouping && config.dateGrouping !== 'none'
    ? applyDateGrouping(dataset.rows, config.xColumn, [config.yColumn], config.dateGrouping, theme.fyStartMonth ?? 4)
    : dataset.rows;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <BarChart
        data={barData}
        xColumn={config.xColumn}
        yColumn={config.yColumn}
        orientation={config.orientation}
        title={config.title}
        xLabel={config.xLabel}
        yLabel={config.yLabel}
        color={effectiveColor}
        referenceLines={config.referenceLines}
        onDataPointClick={onDrillClick}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
        showGridLines={theme.gridLines}
      />
    </div>
  );
}

function LineTileContent({
  chart,
  config,
  datasets,
  theme,
  annotations,
  onDrillClick,
}: {
  chart: ChartConfig;
  config: LineTileConfig;
  datasets: Dataset[];
  theme: DashboardTheme;
  annotations: AnnotationDef[];
  onDrillClick?: (xValue: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);

  if (!dataset) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Dataset not found — click to reconfigure
      </div>
    );
  }

  const palette = paletteColors(theme.palette, theme.customColours);
  const effectiveColors = chart.themeOverride === null
    ? config.yColumns.map((_, i) => palette[i % palette.length] ?? config.colors[i] ?? '#005EB8')
    : config.colors;

  const lineData = config.dateGrouping && config.dateGrouping !== 'none'
    ? applyDateGrouping(dataset.rows, config.xColumn, config.yColumns, config.dateGrouping, theme.fyStartMonth ?? 4)
    : dataset.rows;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashLineChart
        data={lineData}
        xColumn={config.xColumn}
        yColumns={config.yColumns}
        title={config.title}
        xLabel={config.xLabel}
        yLabel={config.yLabel}
        colors={effectiveColors}
        showPoints={config.showPoints}
        referenceLines={config.referenceLines}
        annotations={annotations}
        onPointClick={onDrillClick}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
        showGridLines={theme.gridLines}
      />
    </div>
  );
}

function TableTileContent({
  config,
  datasets,
}: {
  config: DataTableTileConfig;
  datasets: Dataset[];
}) {
  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Dataset not found — click to reconfigure
      </div>
    );
  }
  const allColumns = dataset.columns.map((c) => c.name);
  const visibleCols = config.visibleColumns.length > 0 ? config.visibleColumns : allColumns;
  return (
    <DataTable
      data={dataset.rows}
      columns={visibleCols}
      sortColumn={config.sortColumn}
      sortDirection={config.sortDirection}
      pageSize={config.pageSize}
      conditionalFormats={config.conditionalFormats}
      title={config.title}
      compact
    />
  );
}

function RunTileContent({ config, datasets, annotations }: { config: RunTileConfig; datasets: Dataset[]; annotations: AnnotationDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Dataset not found — click to reconfigure
      </div>
    );
  }

  const rows = dataset.rows
    .filter((r) => r[config.dateColumn] != null && r[config.valueColumn] != null && r[config.valueColumn] !== '')
    .map((r) => ({
      date: String(r[config.dateColumn] ?? ''),
      value: String(r[config.valueColumn] ?? ''),
      comment: { title: '', label: '', recalculate: false },
    }));

  if (rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No data — click to reconfigure columns
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <LineChart
        params={{
          data: rows,
          chartKind: 'RunChart',
          title: config.title,
          yAxisLabel: config.yLabel,
          xAxisLabel: config.xLabel,
          width: dims.w,
          height: dims.h,
          marginTop: 36,
          marginBottom: config.xLabel ? 64 : 44,
          marginLeft: 48,
          marginRight: 20,
          titleSize: 13,
          axisLabelSize: 10,
          outlierStatus: true,
          showMean: true,
          showLimits: false,
          events: (config.annotationIds ?? [])
            .map((id) => annotations.find((a) => a.id === id))
            .filter(Boolean)
            .map((a) => ({ date: a!.date, label: a!.label })),
        }}
      />
    </div>
  );
}

function ParetoTileContent({
  config,
  datasets,
  theme,
  onDrillClick,
}: {
  config: ParetoTileConfig;
  datasets: Dataset[];
  theme: DashboardTheme;
  onDrillClick?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setDims({
          w: Math.max(200, Math.floor(entry.contentRect.width)),
          h: Math.max(120, Math.floor(entry.contentRect.height)),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Dataset not found — click to reconfigure
      </div>
    );
  }

  const inputRows: ParetoInputCategory[] = [];
  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const cat = String(row[config.categoryColumn] ?? '').trim();
    if (!cat || cat === 'null') continue;
    if (config.valueColumn) {
      map.set(cat, (map.get(cat) ?? 0) + (Number(row[config.valueColumn]) || 0));
    } else {
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
  }
  for (const [name, count] of map) inputRows.push({ name, count });

  const analysis = inputRows.length > 0 ? analysePareto(inputRows) : null;
  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        No data — click to reconfigure columns
      </div>
    );
  }

  const chartColor = paletteColors(theme.palette, theme.customColours)[0] ?? '#005EB8';

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashParetoChart
        analysis={analysis}
        title={config.title}
        yLabel={config.yLabel}
        showPercentage={config.showPercentage}
        onBarClick={onDrillClick}
        width={dims.w}
        height={dims.h}
        color={chartColor}
        fontFamily={theme.fontFamily}
      />
    </div>
  );
}

function PieTileContent({ config, datasets, theme, onDrillClick }: { config: PieTileConfig; datasets: Dataset[]; theme: DashboardTheme; onDrillClick?: (label: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const cat = String(row[config.categoryColumn] ?? '').trim();
    if (!cat || cat === 'null') continue;
    if (config.valueColumn) {
      map.set(cat, (map.get(cat) ?? 0) + (Number(row[config.valueColumn]) || 0));
    } else {
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
  }
  let slices = Array.from(map.entries()).map(([label, value]) => ({ label, value })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  if (config.otherThreshold > 0 && slices.length > 0) {
    const total = slices.reduce((s, e) => s + e.value, 0);
    const main = slices.filter((e) => (e.value / total) * 100 >= config.otherThreshold);
    const otherVal = slices.filter((e) => (e.value / total) * 100 < config.otherThreshold).reduce((s, e) => s + e.value, 0);
    slices = otherVal > 0 ? [...main, { label: 'Other', value: otherVal }] : main;
  }
  if (slices.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">No data — click to reconfigure</div>;

  const colors = config.colors.length > 0 ? config.colors : paletteColors(theme.palette, theme.customColours);
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashPieChart slices={slices} title={config.title} labelKind={config.labelKind} innerRadius={config.innerRadius} colors={colors} onSliceClick={onDrillClick} width={dims.w} height={dims.h} fontFamily={theme.fontFamily} />
    </div>
  );
}

function AreaTileContent({ config, datasets, theme }: { config: AreaTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;
  const colors = config.colors.length > 0 ? config.colors : paletteColors(theme.palette, theme.customColours);
  const rows = config.dateGrouping && config.dateGrouping !== 'none'
    ? applyDateGrouping(dataset.rows, config.xColumn, config.yColumns, config.dateGrouping, theme.fyStartMonth ?? 4)
    : dataset.rows;
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashAreaChart data={rows} xColumn={config.xColumn} yColumns={config.yColumns} title={config.title} xLabel={config.xLabel} yLabel={config.yLabel} stacked={config.stacked} colors={colors} referenceLines={config.referenceLines} width={dims.w} height={dims.h} fontFamily={theme.fontFamily} showGridLines={theme.gridLines} />
    </div>
  );
}

function ScatterTileContent({ config, datasets, theme }: { config: ScatterTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;
  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashScatterChart data={dataset.rows} xColumn={config.xColumn} yColumn={config.yColumn} colorColumn={config.colorColumn} sizeColumn={config.sizeColumn} title={config.title} xLabel={config.xLabel} yLabel={config.yLabel} pointColor={config.pointColor} width={dims.w} height={dims.h} fontFamily={theme.fontFamily} showGridLines={theme.gridLines} />
    </div>
  );
}

function HeatmapTileContent({ config, datasets }: { config: HeatmapTileConfig; datasets: Dataset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({
        w: Math.max(200, Math.floor(entry.contentRect.width)),
        h: Math.max(120, Math.floor(entry.contentRect.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) {
    return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;
  }

  const map = new Map<string, Map<string, number[]>>();
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const row of dataset.rows) {
    const r = String(row[config.rowColumn] ?? '').trim();
    const c = String(row[config.colColumn] ?? '').trim();
    const v = Number(row[config.valueColumn]);
    if (!r || !c || isNaN(v)) continue;
    rowSet.add(r); colSet.add(c);
    if (!map.has(r)) map.set(r, new Map());
    const inner = map.get(r)!;
    if (!inner.has(c)) inner.set(c, []);
    inner.get(c)!.push(v);
  }

  const data: HeatmapData[] = [];
  for (const [rowLabel, inner] of map) {
    for (const [colLabel, vals] of inner) {
      data.push({ rowLabel, colLabel, value: vals.reduce((s, v) => s + v, 0) / vals.length });
    }
  }

  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-gray-400">No data — click to reconfigure columns</div>;
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashHeatmapChart
        data={data}
        rowOrder={Array.from(rowSet)}
        colOrder={Array.from(colSet)}
        title={config.title}
        colorScheme={config.colorScheme}
        showValues={config.showValues}
        width={dims.w}
        height={dims.h}
        fontFamily="Arial"
      />
    </div>
  );
}

function GanttTileContent({ config, datasets, theme }: { config: GanttTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const tasks: GanttTask[] = [];
  const catSet = new Set<string>();
  for (const row of dataset.rows) {
    const label = String(row[config.labelColumn] ?? '').trim();
    const startRaw = row[config.startColumn];
    const endRaw = row[config.endColumn];
    if (!label || startRaw == null || endRaw == null) continue;
    const start = new Date(String(startRaw));
    const end = new Date(String(endRaw));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const category = config.colorColumn ? String(row[config.colorColumn] ?? '').trim() : '';
    tasks.push({ label, start, end: end >= start ? end : start, category });
    if (category) catSet.add(category);
  }

  if (tasks.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">No valid rows — check date column formats</div>;

  const categories = config.colorColumn ? Array.from(catSet) : [];
  const colors = config.colors.length > 0 ? config.colors : paletteColors(theme.palette, theme.customColours);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashGanttChart tasks={tasks} categories={categories} title={config.title} showToday={config.showToday} colors={colors} width={dims.w} height={dims.h} fontFamily={theme.fontFamily} />
    </div>
  );
}

function FunnelTileContent({ config, datasets, theme }: { config: FunnelTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const inputUnits: FunnelInputUnit[] = [];
  for (const row of dataset.rows) {
    const name = String(row[config.nameColumn] ?? '').trim();
    const num = Number(row[config.numeratorColumn]);
    const den = Number(row[config.denominatorColumn]);
    if (name && isFinite(num) && isFinite(den) && den > 0) {
      inputUnits.push({ name, numerator: num, denominator: den });
    }
  }

  if (inputUnits.length < 2) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Not enough data — need ≥ 2 units</div>;

  const analysis = analyseFunnel(inputUnits);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashFunnelChart
        analysis={analysis}
        title={config.title}
        yLabel={config.yLabel}
        asPercentage={config.asPercentage}
        color={config.color}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
      />
    </div>
  );
}

function WaterfallTileContent({ config, datasets, theme }: { config: WaterfallTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const bars: WaterfallBar[] = [];
  for (const row of dataset.rows) {
    const label = String(row[config.labelColumn] ?? '').trim();
    const value = Number(row[config.valueColumn]);
    const isSubtotal = config.subtotalColumn ? Boolean(row[config.subtotalColumn]) : false;
    if (label && isFinite(value)) bars.push({ label, value, isSubtotal });
  }

  if (bars.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">No data — click to reconfigure columns</div>;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashWaterfallChart
        bars={bars}
        title={config.title}
        positiveColor={config.positiveColor}
        negativeColor={config.negativeColor}
        subtotalColor={config.subtotalColor}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
        showGridLines={theme.gridLines}
      />
    </div>
  );
}

function PyramidTileContent({ config, datasets, theme }: { config: PyramidTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const rows: PyramidRow[] = [];
  for (const row of dataset.rows) {
    const ageBand = String(row[config.ageBandColumn] ?? '').trim();
    const male = Number(row[config.maleColumn]);
    const female = Number(row[config.femaleColumn]);
    if (ageBand && isFinite(male) && isFinite(female)) rows.push({ ageBand, male, female });
  }

  if (rows.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">No data — click to reconfigure columns</div>;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashPyramidChart
        rows={rows}
        title={config.title}
        asPercentage={config.asPercentage}
        maleColor={config.maleColor}
        femaleColor={config.femaleColor}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
        showGridLines={theme.gridLines}
      />
    </div>
  );
}

function BoxPlotTileContent({ config, datasets, theme }: { config: BoxPlotTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 480, h: 280 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(200, Math.floor(entry.contentRect.width)), h: Math.max(120, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const groups: BoxGroup[] = [];
  if (config.groupColumn) {
    const map = new Map<string, number[]>();
    for (const row of dataset.rows) {
      const grp = String(row[config.groupColumn] ?? '').trim();
      const val = Number(row[config.valueColumn]);
      if (grp && isFinite(val)) {
        if (!map.has(grp)) map.set(grp, []);
        map.get(grp)!.push(val);
      }
    }
    for (const [label, values] of map) {
      if (values.length >= 4) groups.push({ label, values });
    }
  } else {
    const values = dataset.rows.map((r) => Number(r[config.valueColumn])).filter(isFinite);
    if (values.length >= 4) groups.push({ label: config.valueColumn, values });
  }

  if (groups.length === 0) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Not enough data — each group needs ≥ 4 values</div>;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <DashBoxPlotChart
        groups={groups}
        title={config.title}
        yLabel={config.yLabel}
        showOutliers={config.showOutliers}
        color={config.color}
        width={dims.w}
        height={dims.h}
        fontFamily={theme.fontFamily}
        showGridLines={theme.gridLines}
      />
    </div>
  );
}

function CalendarTileContent({ config, datasets }: { config: CalendarHeatmapTileConfig; datasets: Dataset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 700, h: 180 });
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: Math.max(300, Math.floor(entry.contentRect.width)), h: Math.max(80, Math.floor(entry.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;

  const map = new Map<string, number>();
  for (const row of dataset.rows) {
    const raw = row[config.dateColumn];
    if (raw == null) continue;
    const d = new Date(String(raw));
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    if (config.valueColumn) {
      const v = Number(row[config.valueColumn]);
      if (!isNaN(v)) map.set(key, (map.get(key) ?? 0) + v);
    } else {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  const calData: CalendarDay[] = Array.from(map.entries()).map(([date, value]) => ({ date, value }));

  if (calData.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-gray-400">No data — click to reconfigure</div>;
  }

  const years = Array.from(new Set(calData.map((d) => new Date(d.date).getFullYear()))).sort((a, b) => b - a);
  const safeYear = years.includes(year) ? year : years[0];

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden flex flex-col">
      {years.length > 1 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-2 pt-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); setYear((y) => y - 1); }} className="text-xs text-gray-400 hover:text-gray-600">←</button>
          <span className="text-xs text-gray-500 font-medium">{safeYear}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); setYear((y) => y + 1); }} className="text-xs text-gray-400 hover:text-gray-600">→</button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <DashCalendarHeatmap
          data={calData}
          year={safeYear}
          colorScheme={config.colorScheme}
          width={dims.w}
          height={years.length > 1 ? dims.h - 24 : dims.h}
        />
      </div>
    </div>
  );
}

function ImageTileContent({ config }: { config: ImageTileConfig }) {
  if (!config.dataUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Zm10.5-10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
        <span className="text-sm">Click to add image</span>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <img
          src={config.dataUrl}
          alt={config.title || 'Image tile'}
          className="w-full h-full"
          style={{ objectFit: config.objectFit }}
        />
      </div>
      {config.title && (
        <p className="flex-shrink-0 text-xs text-center text-gray-500 px-2 py-1 truncate">
          {config.title}
        </p>
      )}
    </div>
  );
}

function TitleTileContent({ config }: { config: TitleTileConfig }) {
  const isAccent = config.backgroundKind === 'accent';
  return (
    <div
      className="w-full h-full flex flex-col justify-center overflow-hidden"
      style={{ backgroundColor: isAccent ? config.accent : '#fff' }}
    >
      {!isAccent && (
        <div className="h-1 flex-shrink-0" style={{ backgroundColor: config.accent }} />
      )}
      <div className={`px-5 py-3 flex-1 flex flex-col justify-center ${config.alignment === 'center' ? 'items-center text-center' : ''}`}>
        <p
          className="font-bold leading-tight"
          style={{ color: isAccent ? '#fff' : '#1e293b', fontSize: '1.05rem' }}
        >
          {config.title || 'Section title'}
        </p>
        {config.subtitle && (
          <p className="text-sm mt-0.5 leading-snug" style={{ color: isAccent ? 'rgba(255,255,255,0.8)' : '#64748b' }}>
            {config.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTileContent({ config }: { config: SectionTileConfig }) {
  return (
    <div
      className="w-full h-full rounded-xl"
      style={{
        backgroundColor: config.backgroundColor,
        border: `2px solid ${config.borderColor}`,
        position: 'relative',
      }}
    >
      {config.label && (
        <span
          className="absolute top-2 left-3 text-xs font-semibold px-2 py-0.5 rounded"
          style={{ color: config.borderColor, backgroundColor: config.backgroundColor }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

function ScorecardTileContent({ config, datasets, theme }: { config: ScorecardTileConfig; datasets: Dataset[]; theme: DashboardTheme }) {
  const dataset = datasets.find((d) => d.id === config.datasetId);
  if (!dataset) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Dataset not found — click to reconfigure</div>;
  return <DashScorecardChart dataset={dataset} config={config} fontFamily={theme.fontFamily} />;
}
