import type { ChartSettings } from '@/lib/project/types';
import type { DashboardState, DashboardTheme, PaletteKind } from './types';

export const PALETTE_COLORS: Record<Exclude<PaletteKind, 'custom'>, string[]> = {
  nhs:          ['#003087', '#005EB8', '#41B6E6', '#007f3b', '#d5281b'],
  monochrome:   ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'],
  pastel:       ['#93c5fd', '#6ee7b7', '#fca5a5', '#fde68a', '#c4b5fd'],
  highContrast: ['#000000', '#0000ff', '#ff6600', '#007700', '#880000'],
};

export function paletteColors(palette: PaletteKind, custom: string[] = []): string[] {
  if (palette === 'custom') return custom.length ? custom : PALETTE_COLORS.nhs;
  return PALETTE_COLORS[palette];
}

export const nhsTheme: DashboardTheme = {
  palette: 'nhs',
  customColours: [],
  fontFamily: 'Arial',
  fontSizeScale: 'medium',
  background: 'white',
  gridLines: true,
  borderRadius: 'small',
  tileBorder: true,
  stalenessThresholdDays: 35,
  fyStartMonth: 4,
};

export const nhsChartColors: Partial<ChartSettings> = {
  lineColor: '#005EB8',
  defaultPointColor: '#005EB8',
  medianColor: '#003087',
  confColor: '#41B6E6',
  successColor: '#007f3b',
  outlierColor: '#d5281b',
  backgroundColor: '#ffffff',
};

export function emptyDashboard(): DashboardState {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    datasets: [],
    charts: [],
    ragRules: [],
    metrics: [],
    annotations: [],
    stories: [],
    slideDecks: [],
    dashboard: {
      title: 'My Dashboard',
      theme: { ...nhsTheme },
      tiles: [],
      header: {
        enabled: true,
        title: 'My Dashboard',
        subtitle: '',
        bgColor: '#f8fafc',
        textColor: '#1e293b',
        subtitleColor: '#64748b',
      },
    },
  };
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
