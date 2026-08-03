// Seed project used by both `createProject` (in the store) and the
// ephemeral free chart at `/`. New projects come with one empty measure so the
// user lands directly in the date-setup flow rather than on an empty
// list with a "+ Measure" button to find.

import type {
  ChartSettings,
  Measure,
  Project,
} from './types';

export const defaultChartSettings: ChartSettings = {
  width: 1000,
  height: 600,
  marginTop: 78,
  marginBottom: 80,
  marginRight: 90,
  marginLeft: 50,
  title: '',
  titleSize: 18,
  description: '',
  xAxisLabel: '',
  yAxisLabel: '',
  axisLabelSize: 12,
  lineColor: '#6366f1',        // indigo-500 — clean, modern data line
  lineWidth: 2,
  medianColor: '#1e293b',      // slate-900 — dark authoritative mean line
  medianWidth: 2,
  confColor: '#94a3b8',        // slate-400 — subtle control limits
  confWidth: 1.5,
  defaultPointColor: '#6366f1', // indigo-500
  successColor: '#10b981',     // emerald-500
  outlierColor: '#ef4444',     // red-500
  outlierStatus: true,
  backgroundColor: '#ffffff',
  showMean: true,
  showLimits: true,
  showTarget: true,
  centreLineKind: 'mean',
  logoDataUrl: '',
  showForecast: false,
  forecastPeriods: 6,
};

export function emptyMeasure(id: string, name: string): Measure {
  return {
    id,
    name,
    type: 'outcome',
    chartKind: 'XmR',
    aim: 'increase',
    splitBy: 'none',
    data: [],
    settings: { ...defaultChartSettings },
  };
}

export function createSeedProject(): Project {
  return {
    id: 'seed-project',
    name: 'Untitled project',
    createdAt: new Date().toISOString(),
    aim: { text: '' },
    measures: [emptyMeasure('seed-measure', 'Measure 1')],
    pdsaCycles: [],
    driverDiagram: null,
    ishikawa: null,
    processMap: null,
    incidentDataset: null,
  };
}
