'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDashboardAutosave } from '@/lib/dashboard/useDashboardAutosave';
import type {
  ChartConfig,
  DashboardState,
  DashboardTile,
  DashboardTheme,
  TileKind,
} from '@/lib/dashboard/types';
import { emptyDashboard, newId } from '@/lib/dashboard/seed';
import { downloadDashboard, loadDashboardFile, downloadSnapshot, downloadTemplate, type SnapshotMeta } from '@/lib/dashboard/io';
import SnapshotModal from './SnapshotModal';
import SnapshotHistoryPanel from './SnapshotHistoryPanel';
import DatasetManager from './DatasetManager';
import TileGrid from './TileGrid';
import AddTileDialog from './AddTileDialog';
import SpcTileEditor from './SpcTileEditor';
import KpiTileEditor from './KpiTileEditor';
import TextTileEditor from './TextTileEditor';
import BarTileEditor from './BarTileEditor';
import LineTileEditor from './LineTileEditor';
import ThemePanel from './ThemePanel';
import PiiOnboarding from './PiiOnboarding';
import TileDetailsPanel from './TileDetailsPanel';
import AddPeriodModal, { type RefreshTarget } from './AddPeriodModal';
import DataTableTileEditor from './DataTableTileEditor';
import RunTileEditor from './RunTileEditor';
import ParetoTileEditor from './ParetoTileEditor';
import HeatmapTileEditor from './HeatmapTileEditor';
import PieTileEditor from './PieTileEditor';
import AreaTileEditor from './AreaTileEditor';
import ScatterTileEditor from './ScatterTileEditor';
import FunnelTileEditor from './FunnelTileEditor';
import GanttTileEditor from './GanttTileEditor';
import WaterfallTileEditor from './WaterfallTileEditor';
import PyramidTileEditor from './PyramidTileEditor';
import BoxPlotTileEditor from './BoxPlotTileEditor';
import CalendarHeatmapTileEditor from './CalendarHeatmapTileEditor';
import ImageTileEditor from './ImageTileEditor';
import RagRulesPanel from './RagRulesPanel';
import MetricLibraryPanel from './MetricLibraryPanel';
import AnnotationLibraryPanel from './AnnotationLibraryPanel';
import { isPiiAcknowledgementRequired } from '@/lib/dashboard/piiAck';
import type { TileDetails } from '@/lib/dashboard/types';
import TemplateGallery from './TemplateGallery';
import type { TemplateDef } from '@/lib/dashboard/templates';
import ChartWizard from './ChartWizard';
import ChangeHistoryPanel, { type ChangeEntry } from './ChangeHistoryPanel';
import PresentationMode from './PresentationMode';
import EmbedCodeModal from './EmbedCodeModal';
import ShareLinkModal from './ShareLinkModal';
import SlidedeckMode from './SlidedeckMode';
import PresentPickerModal from './PresentPickerModal';
import ExampleGallery from './ExampleGallery';
import ExampleViewer from './ExampleViewer';
import type { ExampleDef } from '@/lib/dashboard/examples';
import WalkthroughOverlay from './WalkthroughOverlay';
import { WALKTHROUGHS } from '@/lib/dashboard/walkthroughs';
import type { WalkthroughDef } from '@/lib/dashboard/walkthroughs';
import { hasSeen, markSeen } from '@/lib/dashboard/tutorialState';
import SpotlightCard from './SpotlightCard';
import { SPOTLIGHT_CARDS } from '@/lib/dashboard/spotlightCards';
import type { SpotlightCardDef } from '@/lib/dashboard/spotlightCards';
import HelpPanel from './HelpPanel';
import TitleTileEditor from './TitleTileEditor';
import SectionTileEditor from './SectionTileEditor';
import ScorecardTileEditor from './ScorecardTileEditor';
import DashboardHeader from './DashboardHeader';
import DividerTileEditor from './DividerTileEditor';
import GaugeTileEditor from './GaugeTileEditor';
import TreemapTileEditor from './TreemapTileEditor';
import SankeyTileEditor from './SankeyTileEditor';

type EditTarget =
  | { kind: 'spc'; tileId: string | null; chartId: string | null }
  | { kind: 'kpi'; tileId: string | null; chartId: string | null }
  | { kind: 'text'; tileId: string | null; chartId: string | null }
  | { kind: 'bar'; tileId: string | null; chartId: string | null }
  | { kind: 'line'; tileId: string | null; chartId: string | null }
  | { kind: 'table'; tileId: string | null; chartId: string | null }
  | { kind: 'image'; tileId: string | null; chartId: string | null }
  | { kind: 'run'; tileId: string | null; chartId: string | null }
  | { kind: 'pareto'; tileId: string | null; chartId: string | null }
  | { kind: 'heatmap'; tileId: string | null; chartId: string | null }
  | { kind: 'pie'; tileId: string | null; chartId: string | null }
  | { kind: 'area'; tileId: string | null; chartId: string | null }
  | { kind: 'scatter'; tileId: string | null; chartId: string | null }
  | { kind: 'funnel'; tileId: string | null; chartId: string | null }
  | { kind: 'gantt'; tileId: string | null; chartId: string | null }
  | { kind: 'waterfall'; tileId: string | null; chartId: string | null }
  | { kind: 'pyramid'; tileId: string | null; chartId: string | null }
  | { kind: 'boxplot'; tileId: string | null; chartId: string | null }
  | { kind: 'calendar'; tileId: string | null; chartId: string | null }
  | { kind: 'title'; tileId: string | null; chartId: string | null }
  | { kind: 'section'; tileId: string | null; chartId: string | null }
  | { kind: 'scorecard'; tileId: string | null; chartId: string | null }
  | { kind: 'divider'; tileId: string | null; chartId: string | null }
  | { kind: 'gauge'; tileId: string | null; chartId: string | null }
  | { kind: 'treemap'; tileId: string | null; chartId: string | null }
  | { kind: 'sankey'; tileId: string | null; chartId: string | null };

function bgClass(bg: DashboardTheme['background']) {
  if (bg === 'lightGrey') return '#f1f5f9';
  if (bg === 'dark') return '#0f172a';
  return '#f8fafc';
}

interface DashboardWorkspaceProps {
  dashboardId?: string;
  initialState?: DashboardState;
}

export default function DashboardWorkspace({ dashboardId, initialState }: DashboardWorkspaceProps) {
  const { state, setState, saveStatus } = useDashboardAutosave(dashboardId, initialState);
  const [showDatasets, setShowDatasets] = useState(false);
  const [showPiiOnboarding, setShowPiiOnboarding] = useState(false);
  const [pendingDatasetsOpen, setPendingDatasetsOpen] = useState(false);
  const [showAddTile, setShowAddTile] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [showTheme, setShowTheme] = useState(false);
  const [showRagRules, setShowRagRules] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [detailsChartId, setDetailsChartId] = useState<string | null>(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showSnapshotHistory, setShowSnapshotHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [changeHistory, setChangeHistory] = useState<ChangeEntry[]>([]);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showSlidedeck, setShowSlidedeck] = useState(false);
  const [showPresentPicker, setShowPresentPicker] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [viewingExample, setViewingExample] = useState<ExampleDef | null>(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState<WalkthroughDef | null>(null);
  const afterWalkthroughRef = useRef<(() => void) | null>(null);
  const [activeSpotlight, setActiveSpotlight] = useState<{ card: SpotlightCardDef; anchor: HTMLElement | null } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpArticleId, setHelpArticleId] = useState<string | undefined>(undefined);
  const loadRef = useRef<HTMLInputElement>(null);

  const logChange = (action: ChangeEntry['action'], detail: string) => {
    setChangeHistory((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), timestamp: new Date().toISOString(), action, detail },
    ]);
  };

  const closeWalkthrough = () => {
    const after = afterWalkthroughRef.current;
    afterWalkthroughRef.current = null;
    setActiveWalkthrough(null);
    after?.();
  };

  const trySpotlight = (key: string, anchor: HTMLElement | null = null) => {
    const card = SPOTLIGHT_CARDS[key];
    if (card && !hasSeen(card.id)) {
      markSeen(card.id);
      setActiveSpotlight({ card, anchor });
    }
  };

  // Welcome walkthrough disabled — was intercepting all clicks on first visit

  const refreshableTargets: RefreshTarget[] = state.datasets
    .filter((d) => d.refreshConfig?.enabled && d.refreshConfig.periodColumn && d.refreshConfig.valueColumns.length > 0)
    .map((d) => ({ dataset: d, config: d.refreshConfig! }));

  const openDatasets = () => {
    if (isPiiAcknowledgementRequired()) {
      setPendingDatasetsOpen(true);
      setShowPiiOnboarding(true);
    } else {
      setShowDatasets(true);
    }
  };

  const handleLayoutChange = (updatedTiles: DashboardTile[]) => {
    setState((s) => {
      // Apply position/size changes from the layout event onto the authoritative tile list.
      // We start from s.dashboard.tiles (not updatedTiles) so that tiles added by saveChart
      // in the same batch are never lost to a stale layout callback.
      const byId = Object.fromEntries(updatedTiles.map((t) => [t.id, t]));
      const merged = s.dashboard.tiles.map((t) => byId[t.id] ?? t);
      return { ...s, dashboard: { ...s.dashboard, tiles: merged } };
    });
  };

  const handleTileClick = (tileId: string) => {
    const tile = state.dashboard.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    const chart = state.charts.find((c) => c.id === tile.chartId);
    if (!chart) return;
    trySpotlight('tile-click');
    setEditTarget({ kind: chart.type as TileKind, tileId: tile.id, chartId: chart.id } as EditTarget);
  };

  const handleDeleteTile = (tileId: string) => {
    const chart = state.charts.find((c) => c.id === state.dashboard.tiles.find((t) => t.id === tileId)?.chartId);
    if (!window.confirm('Remove this tile from the dashboard?')) return;
    setState((s) => {
      const tile = s.dashboard.tiles.find((t) => t.id === tileId);
      const remainingTiles = s.dashboard.tiles.filter((t) => t.id !== tileId);
      const chartStillUsed = (chartId: string) => remainingTiles.some((t) => t.chartId === chartId);
      return {
        ...s,
        dashboard: { ...s.dashboard, tiles: remainingTiles },
        charts: tile ? s.charts.filter((c) => c.id !== tile.chartId || chartStillUsed(c.id)) : s.charts,
      };
    });
    logChange('tile-deleted', chart?.name ?? 'Unnamed tile');
  };

  const handleDuplicateTile = (tileId: string) => {
    const tile = state.dashboard.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    const chart = state.charts.find((c) => c.id === tile.chartId);
    if (!chart) return;
    const newChartId = newId();
    const newTileId = newId();
    setState((s) => ({
      ...s,
      charts: [...s.charts, { ...chart, id: newChartId }],
      dashboard: {
        ...s.dashboard,
        tiles: [...s.dashboard.tiles, { ...tile, id: newTileId, chartId: newChartId, y: tile.y + tile.h }],
      },
    }));
    logChange('tile-duplicated', chart.name);
  };

  const handleDetailsTile = (tileId: string) => {
    const tile = state.dashboard.tiles.find((t) => t.id === tileId);
    if (!tile) return;
    trySpotlight('tile-details');
    setDetailsChartId(tile.chartId);
  };

  const handleTakeSnapshot = (name: string, notes: string) => {
    const json = downloadSnapshot(state, name, notes);
    const snap: SnapshotMeta = {
      id: Math.random().toString(36).slice(2),
      name,
      notes,
      takenAt: new Date().toISOString(),
      json,
    };
    setSnapshots((prev) => [...prev, snap]);
    setShowSnapshotModal(false);
    logChange('snapshot-taken', name);
  };

  const handleMetricsChange = (metrics: import('@/lib/dashboard/types').MetricDef[]) => {
    setState((s) => {
      // Propagate changed metrics → KPI tiles that reference them
      const updatedCharts = s.charts.map((chart) => {
        if (chart.type !== 'kpi') return chart;
        const kpiConfig = chart.config as import('@/lib/dashboard/types').KpiTileConfig;
        if (!kpiConfig.metricId) return chart;
        const metric = metrics.find((m) => m.id === kpiConfig.metricId);
        if (!metric) return chart;
        const newConfig: import('@/lib/dashboard/types').KpiTileConfig = {
          ...kpiConfig,
          label: metric.name,
          unit: metric.unit,
          comparisonValue: metric.targetValue ?? undefined,
          comparisonLabel: metric.targetLabel,
          higherIsBetter: metric.targetDirection !== 'lower',
          ragRuleId: metric.ragRuleId || undefined,
        };
        const existingDet = chart.details;
        const newDetails: TileDetails = {
          description: metric.description,
          targetValue: metric.targetValue,
          targetLabel: metric.targetLabel,
          targetDirection: metric.targetDirection,
          targetDate: existingDet?.targetDate ?? '',
          actions: existingDet?.actions ?? [],
        };
        return { ...chart, config: newConfig, details: newDetails };
      });
      return { ...s, metrics, charts: updatedCharts };
    });
  };

  const handleAnnotationsChange = (annotations: import('@/lib/dashboard/types').AnnotationDef[]) => {
    setState((s) => ({ ...s, annotations }));
  };

  const handleSaveStories = (stories: import('@/lib/dashboard/types').StoryDef[]) => {
    setState((s) => ({ ...s, stories }));
  };

  const handleSaveDecks = (slideDecks: import('@/lib/dashboard/types').SlideDeck[]) => {
    setState((s) => ({ ...s, slideDecks }));
  };

  const copyShareLink = () => {
    setShowShareLink(true);
    logChange('dashboard-shared', state.dashboard.title || 'Untitled');
  };

  const saveDetails = (chartId: string, details: TileDetails) => {
    setState((s) => ({
      ...s,
      charts: s.charts.map((c) => (c.id === chartId ? { ...c, details } : c)),
    }));
  };

  const saveChart = (config: ChartConfig, tileId: string | null) => {
    const isEdit = state.charts.some((c) => c.id === config.id);
    setState((s) => {
      const charts = s.charts.some((c) => c.id === config.id)
        ? s.charts.map((c) => (c.id === config.id ? config : c))
        : [...s.charts, config];

      let tiles = s.dashboard.tiles;
      if (!tileId) {
        const sizes: Record<TileKind, { w: number; h: number }> = {
          spc: { w: 6, h: 5 },
          kpi: { w: 3, h: 2 },
          text: { w: 6, h: 3 },
          bar: { w: 6, h: 4 },
          line: { w: 6, h: 4 },
          table: { w: 12, h: 5 },
          image: { w: 3, h: 3 },
          run: { w: 6, h: 5 },
          pareto: { w: 8, h: 5 },
          heatmap: { w: 8, h: 5 },
          pie: { w: 6, h: 5 },
          area: { w: 6, h: 4 },
          scatter: { w: 6, h: 4 },
          funnel: { w: 8, h: 5 },
          gantt: { w: 12, h: 5 },
          waterfall: { w: 8, h: 5 },
          pyramid: { w: 6, h: 5 },
          boxplot: { w: 6, h: 4 },
          calendar: { w: 12, h: 4 },
          title: { w: 12, h: 2 },
          section: { w: 6, h: 5 },
          scorecard: { w: 12, h: 5 },
          divider: { w: 12, h: 1 },
          gauge: { w: 4, h: 4 },
          treemap: { w: 6, h: 5 },
          sankey: { w: 8, h: 5 },
        };
        const maxY = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
        tiles = [
          ...tiles,
          { id: newId(), chartId: config.id, x: 0, y: maxY, ...sizes[config.type] },
        ];
      }

      return { ...s, charts, dashboard: { ...s.dashboard, tiles } };
    });
    logChange(isEdit ? 'chart-edited' : 'chart-added', config.name || config.type);
    setEditTarget(null);
    setShowAddTile(false);
  };

  const handleUpsertDataset = (ds: import('@/lib/dashboard/types').Dataset) => {
    setState((s) => ({
      ...s,
      datasets: s.datasets.some((d) => d.id === ds.id)
        ? s.datasets.map((d) => (d.id === ds.id ? ds : d))
        : [...s.datasets, ds],
    }));
  };

  const handleAddTileKind = (kind: TileKind) => {
    trySpotlight('add-tile');
    setShowAddTile(false);
    setEditTarget({ kind, tileId: null, chartId: null } as EditTarget);
  };

  const handleWizardSelect = (kind: TileKind) => {
    setShowWizard(false);
    setEditTarget({ kind, tileId: null, chartId: null } as EditTarget);
  };

  const handleLoadTemplate = (tpl: TemplateDef) => {
    setState(tpl.build());
    setShowTemplates(false);
  };

  const activeChart = editTarget?.chartId
    ? state.charts.find((c) => c.id === editTarget.chartId)
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: bgClass(state.dashboard.theme.background) }}>
      {/* Hidden file input for loading */}
      <input
        ref={loadRef}
        type="file"
        accept=".json,.dashboard.json,.template.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const isTemplate = f.name.endsWith('.template.json');
            loadDashboardFile(f)
              .then((newState) => {
                setState(newState);
                if (isTemplate) {
                  window.alert(
                    'Template loaded. The dashboard layout and chart settings have been restored.\n\nYour datasets are empty — open "Datasets" to upload your own data and populate the charts.',
                  );
                  logChange('template-loaded', f.name);
                } else {
                  logChange('dashboard-loaded', f.name);
                }
              })
              .catch((err: Error) => window.alert(err.message));
          }
          e.target.value = '';
        }}
      />

      {/* Toolbar */}
      <header className="sticky top-0 z-40 bg-white shadow-sm flex flex-col">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      <div className="px-5 py-3 flex items-center gap-4 bg-gradient-to-r from-indigo-50/60 to-transparent">
        {/* Back to dashboard list — only in cloud mode */}
        {dashboardId && (
          <Link
            href="/dashboard"
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Back to dashboards"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </Link>
        )}

        {/* Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <input
            value={state.dashboard.title}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                dashboard: { ...s.dashboard, title: e.target.value },
              }))
            }
            className="text-sm font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 flex-1 placeholder:text-slate-400 truncate"
            placeholder="Untitled dashboard"
            aria-label="Dashboard title"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save status */}
          {saveStatus === 'local' ? (
            <Link
              href="/auth/signin"
              className="text-xs px-2 py-1 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors whitespace-nowrap"
              title="Sign in to save your dashboards to the cloud"
            >
              Local only · Sign in to save
            </Link>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-full transition-colors ${saveStatus === 'saving' ? 'text-amber-600 bg-amber-50' : 'text-indigo-400 bg-indigo-50'}`}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}

          {/* Data — primary visible CTA */}
          <button
            type="button"
            data-tour="data-button"
            onClick={() => { openDatasets(); }}
            className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
              <path d="M8 2C4.69 2 2 3.12 2 4.5S4.69 7 8 7s6-1.12 6-2.5S11.31 2 8 2zM2 6.5v2C2 9.88 4.69 11 8 11s6-1.12 6-2.5v-2C14 7.88 11.31 9 8 9S2 7.88 2 6.5zM2 10.5v2C2 13.88 4.69 15 8 15s6-1.12 6-2.5v-2C14 11.88 11.31 13 8 13s-6-1.12-6-2.5z"/>
            </svg>
            Data
            {state.datasets.length > 0 && (
              <span className="text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
                {state.datasets.length}
              </span>
            )}
          </button>

          {refreshableTargets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddPeriod(true)}
              className="text-sm px-3 py-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
            >
              + New period
            </button>
          )}

          {/* Examples */}
          <button
            type="button"
            onClick={() => setShowExamples(true)}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors font-medium flex items-center gap-1.5"
            title="Browse examples"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M10.5 5.5l-2 4-4 2 2-4 4-2z" strokeLinejoin="round" />
            </svg>
            Examples
          </button>

          {/* Templates — secondary visible */}
          <button
            type="button"
            data-tour="templates-button"
            onClick={() => setShowTemplates(true)}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors font-medium flex items-center gap-1.5"
            title="Browse templates"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
              <rect x="1" y="1" width="14" height="9" rx="1.5" />
              <path d="M1 6h14M5 6v4" strokeLinecap="round" />
            </svg>
            Templates
          </button>

          {/* Present */}
          <button
            type="button"
            data-tour="present-button"
            onClick={() => { setShowPresentPicker(true); }}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors font-medium flex items-center gap-1.5"
            title="Present this dashboard"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
              <path d="M4 3l9 5-9 5V3z"/>
            </svg>
            Present
          </button>

          {/* Help */}
          <button
            type="button"
            onClick={() => { setHelpArticleId(undefined); setShowHelp(true); }}
            className="text-sm px-2.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            title="Help &amp; guidance"
            aria-label="Help"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z"/>
            </svg>
          </button>

          {/* Save — icon only */}
          <button
            type="button"
            onClick={() => { downloadDashboard(state); logChange('dashboard-saved', state.dashboard.title || 'Untitled'); }}
            className="text-sm px-2.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            title="Save dashboard as JSON"
            aria-label="Save dashboard as JSON"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M8 2v8M5 7l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Share dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              onClick={() => setShowShare((v) => !v)}
              className={`text-sm px-3 py-2 rounded-xl border transition-colors font-medium flex items-center gap-1.5 ${
                showShare
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                <path d="M6.5 3.5H4a2 2 0 000 4h1.5M9.5 3.5H12a2 2 0 010 4h-1.5M5 6h6" strokeLinecap="round"/>
              </svg>
              Share
            </button>

            {showShare && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Share this dashboard</p>
                    <button type="button" onClick={() => { setShowShare(false); copyShareLink(); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0"><path d="M6.5 3.5H4a2 2 0 000 4h1.5M9.5 3.5H12a2 2 0 010 4h-1.5M5 6h6" strokeLinecap="round"/></svg>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Share link</p>
                        <p className="text-xs text-slate-400 mt-0.5">Copy a read-only URL — anyone with the link can view</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => { setShowEmbed(true); setShowShare(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0"><path d="M5 4L2 8l3 4M11 4l3 4-3 4M9 3l-2 10" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Embed code</p>
                        <p className="text-xs text-slate-400 mt-0.5">Embed an interactive iframe in a website or intranet</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => { downloadDashboard(state); logChange('dashboard-saved', state.dashboard.title || 'Untitled'); setShowShare(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0"><path d="M8 2v8M5 7l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Download JSON</p>
                        <p className="text-xs text-slate-400 mt-0.5">Save a backup file including all data and settings</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => { downloadTemplate(state); logChange('template-exported', state.dashboard.title || 'Untitled'); setShowShare(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0"><rect x="1" y="1" width="14" height="9" rx="1.5"/><path d="M1 6h14M5 6v4" strokeLinecap="round"/></svg>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Share as template</p>
                        <p className="text-xs text-slate-400 mt-0.5">Export the layout and chart settings without the data</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ••• overflow menu */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={(e) => { setShowMore((v) => !v); trySpotlight('overflow-menu', e.currentTarget); }}
              className={`text-sm px-3 py-2 rounded-xl border transition-colors font-medium ${
                showMore
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
              aria-label="More options"
            >
              •••
            </button>

            {showMore && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-1.5">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Appearance</p>
                    <button type="button" onClick={() => { setShowTheme(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                      Theme &amp; palette
                    </button>
                    <button type="button" onClick={() => {
                      setState((s) => ({
                        ...s,
                        dashboard: {
                          ...s.dashboard,
                          header: s.dashboard.header?.enabled
                            ? { ...s.dashboard.header, enabled: false }
                            : { enabled: true, title: s.dashboard.title, subtitle: '', bgColor: '#f8fafc', textColor: '#1e293b', subtitleColor: '#64748b', ...(s.dashboard.header ?? {}) },
                        },
                      }));
                      setShowMore(false);
                    }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                      <span>Dashboard header</span>
                      {state.dashboard.header?.enabled && <span className="text-xs text-indigo-500">On</span>}
                    </button>
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Reusable definitions</p>
                    <button type="button" onClick={() => { setShowRagRules(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                      <span>RAG rules</span>
                      {state.ragRules.length > 0 && <span className="text-xs text-slate-400">{state.ragRules.length}</span>}
                    </button>
                    <button type="button" onClick={() => { setShowMetrics(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                      <span>Metrics</span>
                      {state.metrics.length > 0 && <span className="text-xs text-slate-400">{state.metrics.length}</span>}
                    </button>
                    <button type="button" onClick={() => { setShowAnnotations(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                      <span>Annotations</span>
                      {state.annotations.length > 0 && <span className="text-xs text-slate-400">{state.annotations.length}</span>}
                    </button>
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">File</p>
                    <button type="button" onClick={() => { loadRef.current?.click(); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                      Load file…
                    </button>
                    <button type="button" onClick={() => { setShowSnapshotModal(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                      Take snapshot
                    </button>
                    {snapshots.length > 0 && (
                      <button type="button" onClick={() => { setShowSnapshotHistory(true); setShowMore(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                        <span>Snapshot history</span>
                        <span className="text-xs text-slate-400">{snapshots.length}</span>
                      </button>
                    )}
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <button type="button" onClick={() => { setShowHistory((v) => !v); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between">
                      <span>Change history</span>
                      {changeHistory.length > 0 && <span className="text-xs text-slate-400">{changeHistory.length}</span>}
                    </button>
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <button type="button" onClick={() => { setHelpArticleId(undefined); setShowHelp(true); setShowMore(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z"/>
                      </svg>
                      Help &amp; guidance
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* Theme panel */}
      {showTheme && (
        <ThemePanel
          theme={state.dashboard.theme}
          onChange={(theme) =>
            setState((s) => ({ ...s, dashboard: { ...s.dashboard, theme } }))
          }
          onClose={() => setShowTheme(false)}
        />
      )}

      {/* Snapshot modal */}
      {showSnapshotModal && (
        <SnapshotModal
          defaultName={`${state.dashboard.title || 'Dashboard'} — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`}
          onSave={handleTakeSnapshot}
          onCancel={() => setShowSnapshotModal(false)}
        />
      )}

      {/* Snapshot history panel */}
      {showSnapshotHistory && (
        <SnapshotHistoryPanel
          snapshots={snapshots}
          onDelete={(id) => setSnapshots((prev) => prev.filter((s) => s.id !== id))}
          onClose={() => setShowSnapshotHistory(false)}
        />
      )}

      {/* Change history panel */}
      {showHistory && (
        <ChangeHistoryPanel
          entries={changeHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Details panel */}
      {detailsChartId && (() => {
        const chart = state.charts.find((c) => c.id === detailsChartId);
        if (!chart) return null;
        const emptyDet: TileDetails = {
          description: '',
          targetValue: null,
          targetLabel: '',
          targetDirection: 'higher',
          targetDate: '',
          actions: [],
        };
        return (
          <TileDetailsPanel
            chartName={chart.name}
            initialDetails={chart.details ?? emptyDet}
            onSave={(details) => saveDetails(detailsChartId, details)}
            onClose={() => setDetailsChartId(null)}
          />
        );
      })()}

      {/* Dashboard header/navbar */}
      {state.dashboard.header?.enabled && (
        <DashboardHeader
          header={state.dashboard.header}
          onUpdate={(patch) =>
            setState((s) => ({
              ...s,
              dashboard: { ...s.dashboard, header: { ...s.dashboard.header!, ...patch } },
            }))
          }
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <TileGrid
          state={state}
          datasets={state.datasets}
          theme={state.dashboard.theme}
          ragRules={state.ragRules}
          annotations={state.annotations}
          dashboardTitle={state.dashboard.title}
          onAddTile={() => setShowAddTile(true)}
          onLayoutChange={handleLayoutChange}
          onTileClick={handleTileClick}
          onDeleteTile={handleDeleteTile}
          onDuplicateTile={handleDuplicateTile}
          onDetailsTile={handleDetailsTile}
        />
      </main>

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

      {/* Modals */}
      {showPiiOnboarding && (
        <PiiOnboarding
          onConfirm={() => {
            setShowPiiOnboarding(false);
            if (pendingDatasetsOpen) {
              setPendingDatasetsOpen(false);
              setShowDatasets(true);
            }
          }}
          onCancel={() => {
            setShowPiiOnboarding(false);
            setPendingDatasetsOpen(false);
          }}
        />
      )}

      {showDatasets && (
        <DatasetManager
          datasets={state.datasets}
          onChange={(datasets) => {
            const prev = state.datasets;
            if (datasets.length > prev.length) {
              const added = datasets.filter((d) => !prev.find((p) => p.id === d.id));
              added.forEach((d) => logChange('dataset-added', d.name));
            } else if (datasets.length < prev.length) {
              const removed = prev.filter((d) => !datasets.find((n) => n.id === d.id));
              removed.forEach((d) => logChange('dataset-deleted', d.name));
            }
            setState((s) => ({ ...s, datasets }));
          }}
          onClose={() => setShowDatasets(false)}
        />
      )}

      {showAddPeriod && refreshableTargets.length > 0 && (
        <AddPeriodModal
          targets={refreshableTargets}
          onSave={(updatedDatasets) => {
            setState((s) => ({
              ...s,
              datasets: s.datasets.map((d) => {
                const updated = updatedDatasets.find((u) => u.id === d.id);
                return updated ?? d;
              }),
            }));
            const names = updatedDatasets.map((d) => d.name).join(', ');
            logChange('data-refreshed', names);
            setShowAddPeriod(false);
          }}
          onClose={() => setShowAddPeriod(false)}
        />
      )}

      {showAddTile && (
        <AddTileDialog
          onSelect={handleAddTileKind}
          onClose={() => setShowAddTile(false)}
          onChoose={() => { setShowAddTile(false); setShowWizard(true); }}
          datasets={state.datasets}
        />
      )}

      {showWizard && (
        <ChartWizard
          onSelect={handleWizardSelect}
          onBrowse={() => { setShowWizard(false); setShowAddTile(true); }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {showTemplates && (
        <TemplateGallery onSelect={handleLoadTemplate} onDismiss={() => setShowTemplates(false)} />
      )}

      {editTarget?.kind === 'spc' && (
        <SpcTileEditor
          initialMeasure={
            activeChart?.type === 'spc'
              ? (activeChart.config as { measure: import('@/lib/project/types').Measure }).measure
              : undefined
          }
          onSave={(measure) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'spc',
                name: measure.name,
                datasetId: null,
                config: { measure },
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {showRagRules && (
        <RagRulesPanel
          rules={state.ragRules}
          onChange={(ragRules) => setState((s) => ({ ...s, ragRules }))}
          onClose={() => setShowRagRules(false)}
        />
      )}

      {showMetrics && (
        <MetricLibraryPanel
          metrics={state.metrics}
          ragRules={state.ragRules}
          onChange={handleMetricsChange}
          onClose={() => setShowMetrics(false)}
        />
      )}

      {showAnnotations && (
        <AnnotationLibraryPanel
          annotations={state.annotations}
          onChange={handleAnnotationsChange}
          onClose={() => setShowAnnotations(false)}
        />
      )}

      {editTarget?.kind === 'kpi' && (
        <KpiTileEditor
          ragRules={state.ragRules}
          metrics={state.metrics}
          initialConfig={
            activeChart?.type === 'kpi'
              ? (activeChart.config as import('@/lib/dashboard/types').KpiTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'kpi',
                name: config.label || 'KPI',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'text' && (
        <TextTileEditor
          initialConfig={
            activeChart?.type === 'text'
              ? (activeChart.config as import('@/lib/dashboard/types').TextTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'text',
                name: config.title || 'Text',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'bar' && (
        <BarTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'bar'
              ? (activeChart.config as import('@/lib/dashboard/types').BarTileConfig)
              : undefined
          }
          initialThemeOverride={activeChart?.themeOverride ?? null}
          onSave={(config, themeOverride) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'bar',
                name: config.title || config.yColumn || 'Bar chart',
                datasetId: config.datasetId,
                config,
                themeOverride,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'line' && (
        <LineTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          annotations={state.annotations}
          initialConfig={
            activeChart?.type === 'line'
              ? (activeChart.config as import('@/lib/dashboard/types').LineTileConfig)
              : undefined
          }
          initialThemeOverride={activeChart?.themeOverride ?? null}
          onSave={(config, themeOverride) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'line',
                name: config.title || config.yColumns[0] || 'Line chart',
                datasetId: config.datasetId,
                config,
                themeOverride,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'table' && (
        <DataTableTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'table'
              ? (activeChart.config as import('@/lib/dashboard/types').DataTableTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'table',
                name: config.title || 'Data table',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'heatmap' && (
        <HeatmapTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'heatmap'
              ? (activeChart.config as import('@/lib/dashboard/types').HeatmapTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'heatmap',
                name: config.title || `${config.rowColumn} × ${config.colColumn}`,
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'pareto' && (
        <ParetoTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'pareto'
              ? (activeChart.config as import('@/lib/dashboard/types').ParetoTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'pareto',
                name: config.title || config.categoryColumn || 'Pareto chart',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'run' && (
        <RunTileEditor
          datasets={state.datasets}
          annotations={state.annotations}
          initialConfig={
            activeChart?.type === 'run'
              ? (activeChart.config as import('@/lib/dashboard/types').RunTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'run',
                name: config.title || config.valueColumn || 'Run chart',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'image' && (
        <ImageTileEditor
          initialConfig={
            activeChart?.type === 'image'
              ? (activeChart.config as import('@/lib/dashboard/types').ImageTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'image',
                name: config.title || 'Image',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'pie' && (
        <PieTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'pie'
              ? (activeChart.config as import('@/lib/dashboard/types').PieTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'pie',
                name: config.title || config.categoryColumn || 'Pie chart',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'area' && (
        <AreaTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'area'
              ? (activeChart.config as import('@/lib/dashboard/types').AreaTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'area',
                name: config.title || config.yColumns[0] || 'Area chart',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'scatter' && (
        <ScatterTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'scatter'
              ? (activeChart.config as import('@/lib/dashboard/types').ScatterTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'scatter',
                name: config.title || `${config.xColumn} vs ${config.yColumn}`,
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'funnel' && (
        <FunnelTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'funnel'
              ? (activeChart.config as import('@/lib/dashboard/types').FunnelTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'funnel',
                name: config.title || `${config.numeratorColumn} / ${config.denominatorColumn}`,
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'gantt' && (
        <GanttTileEditor
          datasets={state.datasets}
          theme={state.dashboard.theme}
          initialConfig={
            activeChart?.type === 'gantt'
              ? (activeChart.config as import('@/lib/dashboard/types').GanttTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'gantt',
                name: config.title || config.labelColumn || 'Gantt chart',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'waterfall' && (
        <WaterfallTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'waterfall'
              ? (activeChart.config as import('@/lib/dashboard/types').WaterfallTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'waterfall',
                name: config.title || config.valueColumn || 'Waterfall',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'pyramid' && (
        <PyramidTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'pyramid'
              ? (activeChart.config as import('@/lib/dashboard/types').PyramidTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'pyramid',
                name: config.title || config.ageBandColumn || 'Population pyramid',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'boxplot' && (
        <BoxPlotTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'boxplot'
              ? (activeChart.config as import('@/lib/dashboard/types').BoxPlotTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'boxplot',
                name: config.title || config.valueColumn || 'Box plot',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'divider' && (
        <DividerTileEditor
          initialConfig={
            activeChart?.type === 'divider'
              ? (activeChart.config as import('@/lib/dashboard/types').DividerTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'divider',
                name: config.label || 'Divider',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'gauge' && (
        <GaugeTileEditor
          initialConfig={
            activeChart?.type === 'gauge'
              ? (activeChart.config as import('@/lib/dashboard/types').GaugeTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'gauge',
                name: config.label || 'Gauge',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'treemap' && (
        <TreemapTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'treemap'
              ? (activeChart.config as import('@/lib/dashboard/types').TreemapTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'treemap',
                name: config.title || config.labelColumn || 'Treemap',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'sankey' && (
        <SankeyTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'sankey'
              ? (activeChart.config as import('@/lib/dashboard/types').SankeyTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'sankey',
                name: config.title || config.sourceColumn || 'Sankey',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {showExamples && !viewingExample && (
        <ExampleGallery
          onView={(ex) => { setViewingExample(ex); setShowExamples(false); }}
          onDismiss={() => setShowExamples(false)}
        />
      )}

      {viewingExample && (
        <ExampleViewer
          example={viewingExample}
          onUse={(exState) => { setState(exState); setViewingExample(null); logChange('dashboard-loaded', exState.dashboard.title); }}
          onClose={() => { setViewingExample(null); setShowExamples(true); }}
        />
      )}

      {showEmbed && (
        <EmbedCodeModal
          state={state}
          onClose={() => setShowEmbed(false)}
        />
      )}

      {showShareLink && (
        <ShareLinkModal
          state={state}
          onClose={() => setShowShareLink(false)}
        />
      )}

      {showPresentPicker && (
        <PresentPickerModal
          onStoryMode={() => { setShowPresentPicker(false); setShowPresentation(true); }}
          onSlideDeck={() => { setShowPresentPicker(false); setShowSlidedeck(true); }}
          onClose={() => setShowPresentPicker(false)}
        />
      )}

      {showPresentation && (
        <PresentationMode
          state={state}
          onSaveStories={handleSaveStories}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {showSlidedeck && (
        <SlidedeckMode
          state={state}
          onSaveDecks={handleSaveDecks}
          onClose={() => setShowSlidedeck(false)}
        />
      )}

      {showHelp && (
        <HelpPanel
          initialArticleId={helpArticleId}
          onClose={() => setShowHelp(false)}
        />
      )}

      {activeWalkthrough && (
        <WalkthroughOverlay
          walkthrough={activeWalkthrough}
          onComplete={closeWalkthrough}
          onSkip={closeWalkthrough}
        />
      )}

      {activeSpotlight && !activeWalkthrough && (
        <SpotlightCard
          card={activeSpotlight.card}
          anchorEl={activeSpotlight.anchor}
          onDismiss={() => setActiveSpotlight(null)}
        />
      )}

      {editTarget?.kind === 'calendar' && (
        <CalendarHeatmapTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'calendar'
              ? (activeChart.config as import('@/lib/dashboard/types').CalendarHeatmapTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'calendar',
                name: config.title || config.dateColumn || 'Calendar heatmap',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'title' && (
        <TitleTileEditor
          initialConfig={activeChart?.type === 'title' ? (activeChart.config as import('@/lib/dashboard/types').TitleTileConfig) : undefined}
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'title',
                name: config.title || 'Title',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'section' && (
        <SectionTileEditor
          initialConfig={activeChart?.type === 'section' ? (activeChart.config as import('@/lib/dashboard/types').SectionTileConfig) : undefined}
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'section',
                name: config.label || 'Section',
                datasetId: null,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onCancel={() => setEditTarget(null)}
        />
      )}

      {editTarget?.kind === 'scorecard' && (
        <ScorecardTileEditor
          datasets={state.datasets}
          initialConfig={
            activeChart?.type === 'scorecard'
              ? (activeChart.config as import('@/lib/dashboard/types').ScorecardTileConfig)
              : undefined
          }
          onSave={(config) =>
            saveChart(
              {
                id: editTarget.chartId ?? newId(),
                type: 'scorecard',
                name: config.title || 'Scorecard',
                datasetId: config.datasetId,
                config,
                themeOverride: null,
                drillThrough: { enabled: false, targetType: 'filteredView', targetDashboardId: null, filterColumn: null },
              },
              editTarget.tileId,
            )
          }
          onUpsertDataset={handleUpsertDataset}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

