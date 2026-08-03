import { newId } from '@/lib/dashboard/seed';
import { defaultChartSettings } from '@/lib/project/seed';
import type { DashboardState } from '@/lib/dashboard/types';

// Mark synthetic datasets so they are stripped on JSON export
const SYNTHETIC_TAG = '_synthetic';

function syntheticDataset(
  name: string,
  columns: { name: string; type: 'numeric' | 'date' | 'text' }[],
  rows: Record<string, string | number | null>[],
) {
  return {
    id: newId(),
    name,
    filename: `${SYNTHETIC_TAG}`,
    uploadedAt: new Date().toISOString(),
    columns: columns.map((c) => ({ name: c.name, type: c.type })),
    rows,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// A&E Performance template
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function aeTemplate(): DashboardState {
  const dsId = newId();
  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const attendances =  [8214, 8437, 8102, 8651, 8823, 8312, 8540, 9102, 9341, 9487, 8893, 8754];
  const pct4hr      =  [87.2, 88.1, 89.4, 86.7, 85.3, 88.9, 84.1, 81.6, 78.9, 76.4, 79.8, 82.3];
  const admissions  =  [1823, 1912, 1754, 1943, 1987, 1832, 1901, 2031, 2210, 2341, 2198, 2054];

  const ds = syntheticDataset('A&E Performance (sample)',
    [
      { name: 'Month', type: 'text' },
      { name: 'Attendances', type: 'numeric' },
      { name: '4-hour % (all types)', type: 'numeric' },
      { name: 'Emergency admissions', type: 'numeric' },
    ],
    months.map((m, i) => ({ Month: m, Attendances: attendances[i], '4-hour % (all types)': pct4hr[i], 'Emergency admissions': admissions[i] })),
  );
  ds.id = dsId;

  const kpiChart = {
    id: newId(), type: 'kpi' as const, name: 'Latest 4-hour %',
    datasetId: null,
    config: { label: 'A&E 4-hour standard', value: 82.3, unit: '%', comparisonValue: 95, comparisonLabel: 'National standard', higherIsBetter: true },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };
  const lineChart = {
    id: newId(), type: 'line' as const, name: 'A&E 4-hour standard over time',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumns: ['4-hour % (all types)'], title: 'A&E 4-hour standard', xLabel: '', yLabel: '% seen within 4 hrs', colors: ['#005EB8'], showPoints: true, referenceLines: [{ id: newId(), value: 95, label: 'National standard (95%)', source: 'NHS England', color: '#d5281b' }] },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };
  const barChart = {
    id: newId(), type: 'bar' as const, name: 'Monthly attendances',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumn: 'Attendances', orientation: 'vertical' as const, title: 'Monthly attendances', xLabel: '', yLabel: 'Attendances', color: '#41B6E6', referenceLines: [] },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };
  const textChart = {
    id: newId(), type: 'text' as const, name: 'Commentary',
    datasetId: null,
    config: { title: 'A&E Performance â€” Commentary', content: 'This dashboard shows emergency department performance for the current financial year. The 4-hour standard target is 95% (NHS England). Performance declined during winter months (Decemberâ€“January) driven by increased attendances and emergency admissions.\n\nReplace the sample data by uploading your own CSV from the Datasets panel.' },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };

  const kpiId = kpiChart.id;
  const lineId = lineChart.id;
  const barId = barChart.id;
  const textId = textChart.id;

  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    datasets: [ds],
    charts: [kpiChart, lineChart, barChart, textChart],
    ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'A&E Performance Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpiId, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: lineId, x: 3, y: 0, w: 9, h: 4 },
        { id: newId(), chartId: barId, x: 0, y: 2, w: 6, h: 4 },
        { id: newId(), chartId: textId, x: 0, y: 4, w: 6, h: 3 },
      ],
    },
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Workforce template
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function workforceTemplate(): DashboardState {
  const dsId = newId();
  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const sickness   = [4.2, 3.9, 3.7, 3.4, 3.6, 4.1, 4.8, 5.1, 6.2, 6.7, 5.8, 5.1];
  const vacancy    = [8.4, 8.1, 7.9, 7.6, 7.8, 8.0, 8.3, 8.5, 8.8, 9.1, 8.9, 8.6];
  const mandTrain  = [82, 83, 85, 86, 87, 86, 84, 83, 81, 80, 82, 84];

  const ds = syntheticDataset('Workforce KPIs (sample)',
    [
      { name: 'Month', type: 'text' },
      { name: 'Sickness absence %', type: 'numeric' },
      { name: 'Vacancy rate %', type: 'numeric' },
      { name: 'Mandatory training %', type: 'numeric' },
    ],
    months.map((m, i) => ({ Month: m, 'Sickness absence %': sickness[i], 'Vacancy rate %': vacancy[i], 'Mandatory training %': mandTrain[i] })),
  );
  ds.id = dsId;

  const kpi1 = { id: newId(), type: 'kpi' as const, name: 'Sickness absence (latest)', datasetId: null,
    config: { label: 'Sickness absence', value: 5.1, unit: '%', comparisonValue: 3.5, comparisonLabel: 'NHS target', higherIsBetter: false },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const kpi2 = { id: newId(), type: 'kpi' as const, name: 'Mandatory training (latest)', datasetId: null,
    config: { label: 'Mandatory training', value: 84, unit: '%', comparisonValue: 85, comparisonLabel: 'Trust target', higherIsBetter: true },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const lineChart = { id: newId(), type: 'line' as const, name: 'Sickness & Vacancy trends',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumns: ['Sickness absence %', 'Vacancy rate %'], title: 'Sickness and Vacancy rates', xLabel: '', yLabel: '%', colors: ['#d5281b', '#f47738'], showPoints: true,
      referenceLines: [{ id: newId(), value: 3.5, label: 'Sickness target (3.5%)', source: 'NHS England', color: '#007f3b' }] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const barChart = { id: newId(), type: 'bar' as const, name: 'Mandatory training compliance',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumn: 'Mandatory training %', orientation: 'vertical' as const, title: 'Mandatory training compliance', xLabel: '', yLabel: '%', color: '#005EB8',
      referenceLines: [{ id: newId(), value: 85, label: 'Target (85%)', source: 'Trust standard', color: '#007f3b' }] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  return {
    version: '2.0', exportedAt: new Date().toISOString(), datasets: [ds], charts: [kpi1, kpi2, lineChart, barChart], ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'Workforce Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpi1.id, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: kpi2.id, x: 3, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: lineChart.id, x: 6, y: 0, w: 6, h: 4 },
        { id: newId(), chartId: barChart.id, x: 0, y: 2, w: 6, h: 4 },
      ],
    },
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Quality Improvement template
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function qiTemplate(): DashboardState {
  const dsId = newId();
  const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024',
                  'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'];
  // Pre-intervention values higher (worse), post-intervention lower
  const readmissions = [8.4, 9.1, 8.7, 9.3, 8.9, 8.6, 7.2, 6.8, 6.4, 5.9, 6.1, 5.7];
  const falls        = [14, 12, 15, 13, 14, 12, 9, 8, 7, 6, 7, 6];

  const ds = syntheticDataset('Quality Indicators (sample)',
    [
      { name: 'Month', type: 'text' },
      { name: '30-day readmission rate %', type: 'numeric' },
      { name: 'Falls per 1,000 bed days', type: 'numeric' },
    ],
    months.map((m, i) => ({ Month: m, '30-day readmission rate %': readmissions[i], 'Falls per 1,000 bed days': falls[i] })),
  );
  ds.id = dsId;

  // SPC chart for readmissions
  const spcRows = months.map((m, i) => ({
    date: m, value: String(readmissions[i]),
    comment: i === 6
      ? { title: 'Discharge bundle introduced', label: 'PDSA 1', recalculate: true as const }
      : { title: '', label: '', recalculate: false as const },
  }));

  const spcChart = {
    id: newId(), type: 'spc' as const, name: '30-day readmissions (SPC)',
    datasetId: null,
    config: {
      measure: {
        id: newId(), name: '30-day readmission rate',
        type: 'outcome' as const,
        chartKind: 'XmR' as const,
        aim: 'decrease' as const,
        target: 5,
        splitBy: 'none' as const,
        increment: 'monthly' as const,
        data: spcRows,
        settings: { ...defaultChartSettings, title: '30-day readmission rate (%)', yAxisLabel: '%' },
      },
    },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };

  const barChart = {
    id: newId(), type: 'bar' as const, name: 'Falls rate',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumn: 'Falls per 1,000 bed days', orientation: 'vertical' as const, title: 'Falls per 1,000 bed days', xLabel: '', yLabel: 'Falls per 1,000 bed days', color: '#ae2573', referenceLines: [] },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };

  const textChart = {
    id: newId(), type: 'text' as const, name: 'Improvement commentary',
    datasetId: null,
    config: { title: 'Quality Improvement â€” Commentary', content: 'This dashboard tracks two key quality indicators following improvement work in 2024.\n\nA new discharge bundle (PDSA cycle 1) was introduced in July 2024. The SPC chart shows a shift in the readmission rate following this intervention â€” the centre line recalculates from July onwards.\n\nFalls data shows a sustained reduction from Q3 2024. Replace sample data by uploading your own CSV.' },
    themeOverride: null,
    drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null },
  };

  return {
    version: '2.0', exportedAt: new Date().toISOString(), datasets: [ds], charts: [spcChart, barChart, textChart], ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'Quality Improvement Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: spcChart.id, x: 0, y: 0, w: 8, h: 5 },
        { id: newId(), chartId: barChart.id, x: 8, y: 0, w: 4, h: 5 },
        { id: newId(), chartId: textChart.id, x: 0, y: 5, w: 6, h: 3 },
      ],
    },
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Referral to Treatment (RTT) template
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function rttTemplate(): DashboardState {
  const dsId = newId();
  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const incomplete  = [85412, 86103, 84987, 87234, 88901, 87654, 89012, 91230, 93401, 95012, 93876, 92341];
  const pct18wk     = [74.2, 73.8, 75.1, 74.6, 73.9, 74.8, 75.3, 73.1, 72.4, 71.8, 72.9, 74.1];
  const longWaiters = [1823, 1912, 1743, 1986, 2041, 1934, 2103, 2341, 2587, 2812, 2654, 2431];

  const ds = syntheticDataset('RTT Performance (sample)',
    [
      { name: 'Month', type: 'text' },
      { name: 'Incomplete pathways', type: 'numeric' },
      { name: '18-week standard %', type: 'numeric' },
      { name: 'Patients waiting > 52 weeks', type: 'numeric' },
    ],
    months.map((m, i) => ({ Month: m, 'Incomplete pathways': incomplete[i], '18-week standard %': pct18wk[i], 'Patients waiting > 52 weeks': longWaiters[i] })),
  );
  ds.id = dsId;

  const kpi1 = { id: newId(), type: 'kpi' as const, name: '18-week standard (latest)', datasetId: null,
    config: { label: 'RTT 18-week standard', value: 74.1, unit: '%', comparisonValue: 92, comparisonLabel: 'National standard', higherIsBetter: true },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const kpi2 = { id: newId(), type: 'kpi' as const, name: '52-week waiters (latest)', datasetId: null,
    config: { label: 'Patients > 52 weeks', value: 2431, unit: '', comparisonValue: 2812, comparisonLabel: 'Previous month', higherIsBetter: false },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const lineChart = { id: newId(), type: 'line' as const, name: 'RTT 18-week standard trend',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumns: ['18-week standard %'], title: 'RTT 18-week standard', xLabel: '', yLabel: '% within 18 weeks', colors: ['#005EB8'], showPoints: true,
      referenceLines: [{ id: newId(), value: 92, label: 'National standard (92%)', source: 'NHS England', color: '#d5281b' }] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const barChart = { id: newId(), type: 'bar' as const, name: 'Total incomplete pathways',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumn: 'Incomplete pathways', orientation: 'vertical' as const, title: 'Total incomplete pathways', xLabel: '', yLabel: 'Patients', color: '#41B6E6', referenceLines: [] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  return {
    version: '2.0', exportedAt: new Date().toISOString(), datasets: [ds], charts: [kpi1, kpi2, lineChart, barChart], ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'RTT Performance Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpi1.id, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: kpi2.id, x: 3, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: lineChart.id, x: 6, y: 0, w: 6, h: 4 },
        { id: newId(), chartId: barChart.id, x: 0, y: 2, w: 6, h: 4 },
      ],
    },
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Infection Prevention template
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function infectionTemplate(): DashboardState {
  const dsId = newId();
  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const cdiff   = [3, 2, 4, 3, 2, 3, 5, 4, 6, 7, 5, 4];
  const mrsa    = [0, 1, 0, 0, 0, 1, 0, 1, 2, 1, 0, 1];
  const gnbsi   = [12, 11, 14, 13, 12, 14, 16, 15, 18, 20, 17, 15];

  const ds = syntheticDataset('Infection Prevention (sample)',
    [
      { name: 'Month', type: 'text' },
      { name: 'C. diff cases', type: 'numeric' },
      { name: 'MRSA cases', type: 'numeric' },
      { name: 'Gram-negative BSI', type: 'numeric' },
    ],
    months.map((m, i) => ({ Month: m, 'C. diff cases': cdiff[i], 'MRSA cases': mrsa[i], 'Gram-negative BSI': gnbsi[i] })),
  );
  ds.id = dsId;

  const cdiffChart = { id: newId(), type: 'bar' as const, name: 'C. diff cases',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumn: 'C. diff cases', orientation: 'vertical' as const, title: 'C. difficile cases', xLabel: '', yLabel: 'Cases', color: '#d5281b',
      referenceLines: [{ id: newId(), value: 0, label: 'Zero tolerance', source: 'NHS England', color: '#007f3b' }] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const lineChart = { id: newId(), type: 'line' as const, name: 'Infection trend',
    datasetId: dsId,
    config: { datasetId: dsId, xColumn: 'Month', yColumns: ['C. diff cases', 'Gram-negative BSI'], title: 'Infection rates trend', xLabel: '', yLabel: 'Cases', colors: ['#d5281b', '#f47738'], showPoints: true, referenceLines: [] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };
  const kpi1 = { id: newId(), type: 'kpi' as const, name: 'MRSA (year to date)', datasetId: null,
    config: { label: 'MRSA cases (YTD)', value: mrsa.reduce((a, b) => a + b, 0), unit: '', higherIsBetter: false },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  return {
    version: '2.0', exportedAt: new Date().toISOString(), datasets: [ds], charts: [kpi1, cdiffChart, lineChart], ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'Infection Prevention Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpi1.id, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: cdiffChart.id, x: 3, y: 0, w: 9, h: 4 },
        { id: newId(), chartId: lineChart.id, x: 0, y: 4, w: 12, h: 4 },
      ],
    },
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Public catalogue
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function outpatientTemplate(): DashboardState {
  const dsMonthlyId = newId();
  const dsReasonsId = newId();

  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const capacity = [3420, 3380, 3510, 3290, 3190, 3340, 3430, 3380, 3020, 3110, 3250, 3400];
  const attended = [3021, 2998, 3104, 2897, 2818, 2951, 3031, 2984, 2670, 2749, 2876, 3007];
  const dna      = capacity.map((c, i) => c - attended[i]);
  const dnaRate  = capacity.map((c, i) => Math.round((dna[i] / c) * 1000) / 10);

  const monthly = syntheticDataset('Outpatient Activity (sample)', [
    { name: 'Month', type: 'text' },
    { name: 'Capacity', type: 'numeric' },
    { name: 'Attended', type: 'numeric' },
    { name: 'Did Not Attend', type: 'numeric' },
    { name: 'DNA rate %', type: 'numeric' },
  ], months.map((m, i) => ({ Month: m, Capacity: capacity[i], Attended: attended[i], 'Did Not Attend': dna[i], 'DNA rate %': dnaRate[i] })));
  monthly.id = dsMonthlyId;

  const reasons = syntheticDataset('DNA Reasons (sample)', [
    { name: 'Reason', type: 'text' },
    { name: 'Count', type: 'numeric' },
  ], [
    { Reason: 'Not received appointment letter', Count: 342 },
    { Reason: 'Forgot / no reminder sent', Count: 287 },
    { Reason: 'Unable to get time off work', Count: 219 },
    { Reason: 'Symptoms resolved', Count: 184 },
    { Reason: 'Transport difficulties', Count: 156 },
    { Reason: 'Carer / childcare responsibilities', Count: 98 },
    { Reason: 'Other / unknown', Count: 74 },
  ]);
  reasons.id = dsReasonsId;

  const kpiChart = { id: newId(), type: 'kpi' as const, name: 'DNA rate (latest month)',
    datasetId: null,
    config: { label: 'Outpatient DNA rate', value: 11.6, unit: '%', comparisonValue: 8, comparisonLabel: 'Trust target', higherIsBetter: false },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const areaChart = { id: newId(), type: 'area' as const, name: 'Appointments: attended vs DNA',
    datasetId: dsMonthlyId,
    config: { datasetId: dsMonthlyId, xColumn: 'Month', yColumns: ['Attended', 'Did Not Attend'], title: 'Appointment outcome by month', xLabel: '', yLabel: 'Appointments', stacked: true, colors: ['#007f3b', '#d5281b'], referenceLines: [] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const paretoChart = { id: newId(), type: 'pareto' as const, name: 'Top reasons for DNA',
    datasetId: dsReasonsId,
    config: { datasetId: dsReasonsId, categoryColumn: 'Reason', valueColumn: 'Count', title: 'Top reasons patients did not attend', yLabel: 'Count', showPercentage: true },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const textChart = { id: newId(), type: 'text' as const, name: 'DNA commentary',
    datasetId: null,
    config: { title: 'Outpatient DNA — Commentary', content: '"Not received appointment letter" is the largest single DNA cause. A letter and SMS reminder system would address nearly a third of all DNAs without changing clinical pathways.\n\nDNA rate peaked in December 2024 (11.6%) aligned with the lowest appointment capacity. Replace sample data with your own outpatient activity extract.' },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  return {
    version: '2.0', exportedAt: new Date().toISOString(),
    datasets: [monthly, reasons],
    charts: [kpiChart, areaChart, paretoChart, textChart],
    ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'Outpatient Activity Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpiChart.id, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: areaChart.id, x: 3, y: 0, w: 9, h: 4 },
        { id: newId(), chartId: paretoChart.id, x: 0, y: 4, w: 8, h: 5 },
        { id: newId(), chartId: textChart.id, x: 8, y: 4, w: 4, h: 5 },
      ],
    },
  };
}

function bedOccupancyTemplate(): DashboardState {
  const dsCapacityId = newId();
  const dsHeatmapId  = newId();

  const months = ['Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024',
                  'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025', 'Mar 2025'];
  const totalCap = [520, 520, 520, 505, 505, 515, 520, 520, 525, 530, 520, 520];
  const occBeds  = [481, 468, 462, 448, 442, 468, 486, 491, 510, 519, 505, 492];
  const occPct   = totalCap.map((c, i) => Math.round((occBeds[i] / c) * 1000) / 10);

  const capacityDs = syntheticDataset('Bed Capacity (sample)', [
    { name: 'Month', type: 'text' },
    { name: 'Available beds', type: 'numeric' },
    { name: 'Occupied beds', type: 'numeric' },
    { name: 'Occupancy %', type: 'numeric' },
  ], months.map((m, i) => ({ Month: m, 'Available beds': totalCap[i], 'Occupied beds': occBeds[i], 'Occupancy %': occPct[i] })));
  capacityDs.id = dsCapacityId;

  const wards = ['Ward A – Medical', 'Ward B – Surgical', 'Ward C – Orthopaedics', 'Ward D – Medical', 'Ward E – Care of Elderly'];
  const wardOcc: Record<string, number[]> = {
    'Ward A – Medical':          [92, 89, 87, 85, 84, 90, 93, 94, 97, 98, 96, 94],
    'Ward B – Surgical':         [88, 85, 84, 82, 80, 83, 87, 89, 91, 93, 90, 88],
    'Ward C – Orthopaedics':     [85, 82, 80, 79, 77, 81, 84, 86, 88, 90, 87, 85],
    'Ward D – Medical':          [94, 91, 89, 87, 86, 91, 94, 95, 98, 99, 97, 95],
    'Ward E – Care of Elderly':  [91, 88, 86, 84, 83, 88, 92, 93, 96, 98, 95, 93],
  };
  const heatmapRows: Record<string, string | number | null>[] = [];
  for (const ward of wards) {
    for (let i = 0; i < months.length; i++) {
      heatmapRows.push({ Ward: ward, Month: months[i], 'Occupancy %': wardOcc[ward][i] });
    }
  }
  const heatmapDs = syntheticDataset('Ward Occupancy by Month (sample)', [
    { name: 'Ward', type: 'text' },
    { name: 'Month', type: 'text' },
    { name: 'Occupancy %', type: 'numeric' },
  ], heatmapRows);
  heatmapDs.id = dsHeatmapId;

  const kpiChart = { id: newId(), type: 'kpi' as const, name: 'Overall occupancy (latest)',
    datasetId: null,
    config: { label: 'Bed occupancy', value: 94.6, unit: '%', comparisonValue: 92, comparisonLabel: 'NHS guidance threshold', higherIsBetter: false },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const areaChart = { id: newId(), type: 'area' as const, name: 'Occupied vs available beds',
    datasetId: dsCapacityId,
    config: { datasetId: dsCapacityId, xColumn: 'Month', yColumns: ['Occupied beds', 'Available beds'], title: 'Occupied vs available beds', xLabel: '', yLabel: 'Beds', stacked: false, colors: ['#005EB8', '#d8dde0'], referenceLines: [] },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const heatmapChart = { id: newId(), type: 'heatmap' as const, name: 'Ward occupancy by month',
    datasetId: dsHeatmapId,
    config: { datasetId: dsHeatmapId, rowColumn: 'Ward', colColumn: 'Month', valueColumn: 'Occupancy %', title: 'Occupancy % by ward and month', colorScheme: 'sequential-blue' as const, showValues: true },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  const textChart = { id: newId(), type: 'text' as const, name: 'Bed management commentary',
    datasetId: null,
    config: { title: 'Bed Occupancy — Commentary', content: 'Overall occupancy peaked at 98–99% in January 2025 — above the NHS guidance threshold of 92%. Above 92% the system has very limited resilience to absorb emergency demand spikes.\n\nWard D (Medical) and Ward E (Care of Elderly) are consistently the highest-occupied wards. Discharge improvement work should prioritise these.\n\nReplace sample data with your own bed management extract.' },
    themeOverride: null, drillThrough: { enabled: false, targetType: 'filteredView' as const, targetDashboardId: null, filterColumn: null } };

  return {
    version: '2.0', exportedAt: new Date().toISOString(),
    datasets: [capacityDs, heatmapDs],
    charts: [kpiChart, areaChart, heatmapChart, textChart],
    ragRules: [], metrics: [], annotations: [],
    dashboard: {
      title: 'Bed Occupancy Dashboard (sample)',
      theme: { palette: 'nhs', customColours: [], fontFamily: 'Arial', fontSizeScale: 'medium', background: 'white', gridLines: true, borderRadius: 'small', tileBorder: true, stalenessThresholdDays: 35, fyStartMonth: 4 },
      tiles: [
        { id: newId(), chartId: kpiChart.id, x: 0, y: 0, w: 3, h: 2 },
        { id: newId(), chartId: areaChart.id, x: 3, y: 0, w: 9, h: 4 },
        { id: newId(), chartId: heatmapChart.id, x: 0, y: 4, w: 9, h: 5 },
        { id: newId(), chartId: textChart.id, x: 9, y: 4, w: 3, h: 5 },
      ],
    },
  };
}

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  build: () => DashboardState;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'ae',
    name: 'A&E Performance',
    description: '4-hour standard, attendances, and emergency admissions over a 12-month period. Includes national standard reference line.',
    icon: 'ðŸš‘',
    tags: ['ED', 'urgent care', 'waiting times'],
    build: aeTemplate,
  },
  {
    id: 'workforce',
    name: 'Workforce',
    description: 'Sickness absence, vacancy rate, and mandatory training compliance with NHS targets as reference lines.',
    icon: 'ðŸ‘¥',
    tags: ['HR', 'workforce', 'staffing'],
    build: workforceTemplate,
  },
  {
    id: 'qi',
    name: 'Quality Improvement',
    description: 'SPC chart for a process measure pre/post intervention â€” 30-day readmissions and falls rate with a shift annotated.',
    icon: 'ðŸ“ˆ',
    tags: ['SPC', 'improvement', 'PDSA', 'patient safety'],
    build: qiTemplate,
  },
  {
    id: 'rtt',
    name: 'Referral to Treatment (RTT)',
    description: 'Incomplete pathways, 18-week standard, and long waiters trend. RTT 92% national standard shown.',
    icon: 'ðŸ“‹',
    tags: ['waiting times', 'elective', 'RTT'],
    build: rttTemplate,
  },
  {
    id: 'infection',
    name: 'Infection Prevention',
    description: 'C. difficile, MRSA, and gram-negative bloodstream infections over time. Supports zero-tolerance reporting.',
    icon: 'ðŸ¦ ',
    tags: ['IPC', 'infection', 'patient safety'],
    build: infectionTemplate,
  },
  {
    id: 'outpatient',
    name: 'Outpatient DNA',
    description: 'Did Not Attend rates, appointment capacity vs attended (stacked area chart), and a Pareto breakdown of top DNA reasons.',
    icon: '📅',
    tags: ['outpatients', 'DNA', 'Pareto', 'area chart'],
    build: outpatientTemplate,
  },
  {
    id: 'bed-occupancy',
    name: 'Bed Occupancy',
    description: 'Trust-wide occupancy vs 92% NHS guidance threshold, with a ward-by-month heatmap to pinpoint where pressure is highest.',
    icon: '🏥',
    tags: ['beds', 'capacity', 'heatmap', 'area chart'],
    build: bedOccupancyTemplate,
  },
];

export function isSyntheticDataset(filename: string): boolean {
  return filename === SYNTHETIC_TAG;
}
