// Project domain model — the unit of work a user collaborates around.
// Mirrors §3 of spc_app_build_plan-2.md. PDSA cycles, driver diagrams and
// imported incident datasets are typed but not yet UI-driven; they'll
// graduate in later phases.

export type MeasureType = 'outcome' | 'process' | 'balancing';
export type ChartKind = 'XmR' | 'P' | 'C' | 'U' | 'RunChart' | 'Pareto' | 'Funnel';
// 'none' = the user is monitoring this measure but doesn't want to label
// directionality. Trend signals stay neutral; the assurance icon is
// suppressed because "consistently meeting target" implies a direction.
export type AimDirection = 'increase' | 'decrease' | 'none';

// Cadence of the time-series — drives the date-pre-population on a new
// measure and the x-axis tick format. Set once in the date-setup form;
// rarely changed afterwards.
export type Increment = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecalcJustification {
  reason: string;
  confirmedAt: string; // ISO timestamp
}

export interface MeasureComment {
  title?: string;
  label?: string;
  recalculate?: boolean;
  recalcJustification?: RecalcJustification | null;
  /**
   * ISO timestamp set when an annotation is first saved (title+label).
   * Once set, the popover treats the annotation as locked — editing
   * requires an explicit Unlock click. Audit trail for contemporaneous
   * note-taking.
   */
  lockedAt?: string | null;
  // Annotation positioning fields kept for forward compatibility with the
  // annotation work in plan §6.1; not currently rendered.
  xpos?: number;
  ypos?: number;
  colour?: string;
}

// Value stays as a string because the table uses contentEditable cells.
// The SPC maths layer coerces at the boundary (lib/spc/index.ts).
//
// For XmR / RunChart the `value` field holds the metric itself. For
// P / C / U charts it holds the numerator (count of events) and
// `denominator` holds the sample size.
export interface MeasureRow {
  date: string; // YYYY-MM-DD
  value: string;
  denominator?: string;
  comment: MeasureComment;
}

export interface ChartSettings {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  title: string;
  titleSize: number;
  /** One-line description shown as a subtitle under the chart title. */
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  /** Font size (px) of the x and y axis labels. */
  axisLabelSize: number;
  lineColor: string;
  lineWidth: number;
  medianColor: string; // labels the mean line (XmR centre) — name kept for back-compat
  medianWidth: number;
  confColor: string;
  confWidth: number;
  defaultPointColor: string;
  successColor: string;
  outlierColor: string;
  outlierStatus: boolean;
  /** Chart background fill. Defaults to white. */
  backgroundColor: string;
  /** Show the centre (mean/median) line. Default true. */
  showMean: boolean;
  /** Show the upper and lower control limits. Default true. */
  showLimits: boolean;
  /** Show the target line (only renders when measure.target is set). Default true. */
  showTarget: boolean;
  /** Which centre statistic to plot. Default 'mean' (XmR) or 'median' (Run). */
  centreLineKind: 'mean' | 'median';
  /** Data-URL of an uploaded logo, rendered top-right of the chart. */
  logoDataUrl: string;
  /** Show a forecast band (latest segment projected forward). Default false. */
  showForecast: boolean;
  /** How many periods to project forward when forecast is shown. */
  forecastPeriods: number;
}

export type SplitKind = 'none' | 'dayOfWeek' | 'weekdayWeekend' | 'month';

export interface Measure {
  id: string;
  name: string;
  type: MeasureType;
  chartKind: ChartKind;
  aim: AimDirection;
  target?: number;
  splitBy: SplitKind;
  /**
   * Time increment between consecutive rows. Undefined on a brand-new
   * measure that hasn't been through the date-setup form yet. Drives
   * both the date pre-population on creation and the chart's x-axis
   * tick format.
   */
  increment?: Increment;
  data: MeasureRow[];
  settings: ChartSettings;
}

// Structured aim per BGS QI Hub / IHI Model for Improvement. Each field
// is optional during draft; the composed sentence shown to readers uses
// whatever the user has supplied so far. `text` is a free-form fallback
// for when structure isn't worth imposing.
export type AimDirectionVerb = 'increase' | 'decrease' | 'maintain';

export interface AimStatement {
  text?: string;
  population?: string;
  metric?: string;
  direction?: AimDirectionVerb;
  magnitude?: string;
  deadline?: string;
}

// Driver diagram — Aim → primary drivers → secondary drivers →
// change ideas, each editable. A change idea (leaf) may link to a
// measure so the user can navigate between hypothesis and data.
export type DriverNodeType = 'primary' | 'secondary' | 'change-idea';

export interface DriverNode {
  id: string;
  label: string;
  type: DriverNodeType;
  children: DriverNode[];
  /** Only meaningful for change-idea leaves. */
  measureId?: string;
  /**
   * Incident type this change idea is trying to influence. When the
   * leaf is linked to a measure, incidents of this type auto-annotate
   * the measure's chart as event markers. Per plan §7.2.
   */
  linkedIncidentType?: string;
}

export interface DriverDiagram {
  id: string;
  primaryDrivers: DriverNode[];
}

// PDSA cycle — the heart of the Model for Improvement. The state machine
// runs planning → in-progress → studying → done (or abandoned at any
// point). Crucially the prediction locks the moment "Start Do" is hit:
// updating prediction after that point is refused at the operation
// layer, so a team can't quietly massage the prediction to match the
// result.
export type PDSAStatus = 'planning' | 'in-progress' | 'studying' | 'done' | 'abandoned';
export type PDSADecision = 'adopt' | 'adapt' | 'abandon';

export interface PDSACycle {
  id: string;
  title: string;
  status: PDSAStatus;
  createdAt: string;

  // Plan
  question: string;
  prediction: string;
  /** Set the moment status moves to in-progress; non-null means prediction is locked. */
  predictionLockedAt: string | null;

  // Do
  startDate: string;
  doNotes: string;

  // Study
  endDate: string;
  result: string;

  // Act
  decision: PDSADecision | null;
  actNotes: string;

  // Linkage
  linkedMeasureId?: string;
  linkedChangeIdeaId?: string;
}

// Linear process map. A sequence of steps with shape (start / action /
// decision / wait / end), an optional role for each step, and free-text
// notes. Branching swim-lane flowcharts are out of scope — the value of
// a simple, exportable, linear map is the BGS/IHI use case anyway.
export type ProcessStepType = 'start' | 'action' | 'decision' | 'wait' | 'end';

export interface ProcessStep {
  id: string;
  label: string;
  type: ProcessStepType;
  role?: string;
  notes?: string;
}

export interface ProcessMap {
  id: string;
  title: string;
  description?: string;
  steps: ProcessStep[];
}

// Ishikawa (cause-and-effect / fishbone) diagram. A problem statement
// at the head and categorised causes branching off the spine.
export interface IshikawaCause {
  id: string;
  label: string;
}

export interface IshikawaCategory {
  id: string;
  label: string;
  causes: IshikawaCause[];
}

export interface IshikawaDiagram {
  id: string;
  problem: string;
  categories: IshikawaCategory[];
}

// Incident analysis (Phase 4). The shape mirrors what comes out of an
// LFPSE-compliant LRMS export. Stored read-only in the project — the
// app analyses but does not manage the incident lifecycle.
export type IncidentSeverity =
  | 'no-harm'
  | 'low'
  | 'moderate'
  | 'severe'
  | 'death'
  | 'unknown';

export interface Incident {
  id: string;
  datetime: string; // ISO yyyy-mm-dd or full ISO timestamp
  location: string;
  type: string;
  subType?: string;
  severity: IncidentSeverity;
  description?: string;
  contributingFactors?: string[];
}

export interface IncidentDataset {
  id: string;
  importedAt: string; // ISO
  rowCount: number;
  incidents: Incident[];
  /** Exposure (e.g. bed-days, attendances) per location for funnel analysis. */
  locationDenominators?: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  aim: AimStatement;
  measures: Measure[];
  pdsaCycles: PDSACycle[];
  driverDiagram: DriverDiagram | null;
  ishikawa: IshikawaDiagram | null;
  processMap: ProcessMap | null;
  incidentDataset: IncidentDataset | null;
}
