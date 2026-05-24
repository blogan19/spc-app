// Pre-baked measure templates aimed at the typical UK NHS / QI use
// cases. Picking a template pre-fills enough of the wizard to take
// a non-expert user from "+ new measure" → usable chart in two clicks.
//
// Templates only describe the *shape* of the chart (kind, aim, axis
// labels, suggested cadence). The data itself is still entered by the
// user via the empty-chart flow or the spreadsheet upload that runs
// alongside.

import type { AimDirection, ChartKind, Increment } from './types';

export interface MeasureTemplate {
  /** Stable id — used as the React key in template pickers. */
  id: string;
  /** Headline name shown in the picker and pre-filled into the chart title. */
  name: string;
  /** Used to group templates in the picker UI. */
  category: 'Patient safety' | 'Flow & access' | 'Compliance' | 'Other';
  /** One-line description shown under the name and pre-filled into the
   *  chart's description field. */
  description: string;
  chartKind: ChartKind;
  aim: AimDirection;
  xAxisLabel: string;
  yAxisLabel: string;
  /**
   * Suggested cadence. The user can still flip the increment on the
   * date-range step.
   */
  defaultIncrement: Increment;
  /**
   * For P / U / Funnel charts: a human-readable name for the
   * denominator column. The wizard pre-fills the editor table's
   * denominator header with this so it's clear what the user should
   * type in.
   */
  denominatorLabel?: string;
}

export const MEASURE_TEMPLATES: readonly MeasureTemplate[] = [
  // --- Patient safety -----------------------------------------------------
  {
    id: 'falls-per-1000-obd',
    name: 'Falls per 1000 occupied bed days',
    category: 'Patient safety',
    description: 'Inpatient falls normalised by occupied bed days. Use the U chart.',
    chartKind: 'U',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'Falls per 1000 OBD',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Occupied bed days',
  },
  {
    id: 'pressure-ulcers',
    name: 'Hospital-acquired pressure ulcers',
    category: 'Patient safety',
    description: 'Count of new pressure ulcers per month. C chart (constant exposure).',
    chartKind: 'C',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'Pressure ulcers per month',
    defaultIncrement: 'monthly',
  },
  {
    id: 'medication-errors',
    name: 'Medication errors per 1000 admissions',
    category: 'Patient safety',
    description: 'Errors per 1000 admissions. U chart with admission count as the denominator.',
    chartKind: 'U',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'Errors per 1000 admissions',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Admissions',
  },
  {
    id: 'ssi-rate',
    name: 'Surgical site infections (SSI rate)',
    category: 'Patient safety',
    description: 'Proportion of procedures complicated by infection. P chart.',
    chartKind: 'P',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'SSI rate (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Procedures',
  },
  {
    id: 'serious-incidents',
    name: 'Serious incidents reported',
    category: 'Patient safety',
    description: 'Total serious incidents per month. C chart.',
    chartKind: 'C',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'Incidents per month',
    defaultIncrement: 'monthly',
  },

  // --- Flow & access ------------------------------------------------------
  {
    id: 'length-of-stay',
    name: 'Average length of stay',
    category: 'Flow & access',
    description: 'Mean length of stay (days) for discharged patients. XmR chart of monthly means.',
    chartKind: 'XmR',
    aim: 'decrease',
    xAxisLabel: 'Month',
    yAxisLabel: 'LOS (days)',
    defaultIncrement: 'monthly',
  },
  {
    id: 'ed-4hour-wait',
    name: 'ED 4-hour wait compliance',
    category: 'Flow & access',
    description: '% of ED attendances seen, treated and discharged or admitted within 4 hours.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Week',
    yAxisLabel: '4-hour compliance (%)',
    defaultIncrement: 'weekly',
    denominatorLabel: 'ED attendances',
  },
  {
    id: 'daily-admissions',
    name: 'Daily admissions',
    category: 'Flow & access',
    description: 'Number of admissions per day. Useful for spotting demand patterns. XmR chart.',
    chartKind: 'XmR',
    aim: 'decrease',
    xAxisLabel: 'Date',
    yAxisLabel: 'Admissions',
    defaultIncrement: 'daily',
  },
  {
    id: 'rtt-18-weeks',
    name: 'RTT 18-week compliance',
    category: 'Flow & access',
    description: '% of referral-to-treatment pathways completed within 18 weeks. P chart.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Month',
    yAxisLabel: 'RTT compliance (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Pathways completed',
  },
  {
    id: 'discharges-before-noon',
    name: 'Discharges before noon',
    category: 'Flow & access',
    description: '% of discharges happening before midday. P chart.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Week',
    yAxisLabel: 'Discharges before noon (%)',
    defaultIncrement: 'weekly',
    denominatorLabel: 'Discharges',
  },

  // --- Compliance ---------------------------------------------------------
  {
    id: 'hand-hygiene',
    name: 'Hand hygiene compliance',
    category: 'Compliance',
    description: '% of observed hand-hygiene moments performed correctly. P chart.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Month',
    yAxisLabel: 'Compliance (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Observations',
  },
  {
    id: 'dna-rate',
    name: 'DNA (did-not-attend) rate',
    category: 'Compliance',
    description: '% of booked appointments where the patient did not attend. P chart.',
    chartKind: 'P',
    aim: 'decrease',
    xAxisLabel: 'Week',
    yAxisLabel: 'DNA rate (%)',
    defaultIncrement: 'weekly',
    denominatorLabel: 'Booked appointments',
  },
  {
    id: 'must-screening',
    name: 'MUST screening completion',
    category: 'Compliance',
    description: '% of admitted patients screened for malnutrition within 24 h. P chart.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Month',
    yAxisLabel: 'Screened within 24 h (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Admissions',
  },
  {
    id: 'vte-assessment',
    name: 'VTE risk assessment completion',
    category: 'Compliance',
    description: '% of admitted patients with a VTE risk assessment within 24 h. P chart.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Month',
    yAxisLabel: 'Assessed within 24 h (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Admissions',
  },

  // --- Other / generic ---------------------------------------------------
  {
    id: 'generic-xmr',
    name: 'Continuous measure (XmR)',
    category: 'Other',
    description: 'Any continuous metric — one number per period. The workhorse SPC chart.',
    chartKind: 'XmR',
    aim: 'decrease',
    xAxisLabel: 'Period',
    yAxisLabel: 'Value',
    defaultIncrement: 'monthly',
  },
  {
    id: 'generic-proportion',
    name: 'Proportion / compliance (P)',
    category: 'Other',
    description: 'A pass/fail rate where you have a numerator and a denominator.',
    chartKind: 'P',
    aim: 'increase',
    xAxisLabel: 'Period',
    yAxisLabel: 'Proportion (%)',
    defaultIncrement: 'monthly',
    denominatorLabel: 'Denominator',
  },
  {
    id: 'generic-run',
    name: 'Run chart (no limits)',
    category: 'Other',
    description: 'When you want to look at a series visually but it\'s too early for control limits.',
    chartKind: 'RunChart',
    aim: 'decrease',
    xAxisLabel: 'Period',
    yAxisLabel: 'Value',
    defaultIncrement: 'monthly',
  },
];

export type TemplateCategory = MeasureTemplate['category'];

export const TEMPLATE_CATEGORY_ORDER: readonly TemplateCategory[] = [
  'Patient safety',
  'Flow & access',
  'Compliance',
  'Other',
];
