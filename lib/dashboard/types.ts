import type { Measure } from '@/lib/project/types';
import type { ReferenceLine } from '@/lib/dashboard/benchmarks';
import type { DateGrouping } from '@/lib/dashboard/financialYear';
export type { ReferenceLine };
export type { DateGrouping };

export type ColumnType = 'date' | 'numeric' | 'text';

export interface ColumnDef {
  name: string;
  type: ColumnType;
  typeOverride?: ColumnType;
  piiFlag?: string;
}

export interface DatasetRow {
  [key: string]: string | number | null;
}

export interface RefreshConfig {
  enabled: boolean;
  periodColumn: string;
  valueColumns: string[];
  periodFormat: string;
  periodInterval: 'monthly' | 'weekly' | 'quarterly' | 'custom';
}

export interface TransformLogEntry {
  step: number;
  category: 'IMPORT' | 'COLUMN_TYPES' | 'NUMERIC_PARSING' | 'MISSING_VALUES' | 'PII_ACTION';
  title: string;
  body: string;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  uploadedAt: string;
  columns: ColumnDef[];
  rows: DatasetRow[];
  refreshConfig?: RefreshConfig;
  transformLog?: TransformLogEntry[];
}

export type TileKind = 'spc' | 'kpi' | 'text' | 'bar' | 'line' | 'table' | 'image' | 'run' | 'pareto' | 'heatmap' | 'calendar' | 'pie' | 'area' | 'scatter' | 'funnel' | 'gantt' | 'waterfall' | 'pyramid' | 'boxplot' | 'title' | 'section' | 'scorecard';

export type ActionStatus = 'not-started' | 'in-progress' | 'complete';

export interface TileAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;   // YYYY-MM-DD or ''
  status: ActionStatus;
}

export interface TileDetails {
  description: string;
  targetValue: number | null;
  targetLabel: string;
  targetDirection: 'higher' | 'lower' | 'range';
  targetDate: string;   // YYYY-MM-DD or ''
  actions: TileAction[];
}

export interface SpcTileConfig {
  measure: Measure;
}

export interface KpiTileConfig {
  label: string;
  value: number | null;
  unit: string;
  comparisonValue?: number;
  comparisonLabel?: string;
  higherIsBetter: boolean;
  ragRuleId?: string;
  metricId?: string;    // references a MetricDef; drives propagation when metric is updated
}

export type ReviewFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface MetricDef {
  id: string;
  name: string;
  description: string;
  unit: string;
  targetValue: number | null;
  targetLabel: string;
  targetDirection: 'higher' | 'lower' | 'range';
  ragRuleId: string;         // '' = none
  dataSourceHint: string;
  reviewFrequency: ReviewFrequency;
}

export interface TextTileConfig {
  title: string;
  content: string;
}

export interface BarTileConfig {
  datasetId: string;
  xColumn: string;
  yColumn: string;
  orientation: 'vertical' | 'horizontal';
  title: string;
  xLabel: string;
  yLabel: string;
  color: string;
  dateGrouping?: DateGrouping;
  referenceLines?: ReferenceLine[];
}

export interface LineTileConfig {
  datasetId: string;
  xColumn: string;
  yColumns: string[];
  title: string;
  xLabel: string;
  yLabel: string;
  colors: string[];
  showPoints: boolean;
  dateGrouping?: DateGrouping;
  referenceLines?: ReferenceLine[];
  annotationIds?: string[];
}

export type PieLabelKind = 'percentage' | 'value' | 'both' | 'none';

export interface PieTileConfig {
  datasetId: string;
  categoryColumn: string;
  valueColumn: string;      // empty = count occurrences
  title: string;
  innerRadius: number;      // 0 = pie, 0.5 = donut
  labelKind: PieLabelKind;
  otherThreshold: number;   // slices below this % of total grouped into "Other" (0 = off)
  colors: string[];
}

export interface AreaTileConfig {
  datasetId: string;
  xColumn: string;
  yColumns: string[];
  title: string;
  xLabel: string;
  yLabel: string;
  stacked: boolean;
  colors: string[];
  referenceLines?: ReferenceLine[];
  dateGrouping?: DateGrouping;
}

export interface ScatterTileConfig {
  datasetId: string;
  xColumn: string;
  yColumn: string;
  colorColumn: string;    // optional — categorical coloring
  sizeColumn: string;     // optional — bubble sizing
  title: string;
  xLabel: string;
  yLabel: string;
  pointColor: string;
}

export type HeatmapColorScheme = 'sequential-blue' | 'sequential-green' | 'sequential-orange' | 'diverging';

export interface HeatmapTileConfig {
  datasetId: string;
  rowColumn: string;     // y-axis categories
  colColumn: string;     // x-axis categories
  valueColumn: string;   // cell values (numeric)
  title: string;
  colorScheme: HeatmapColorScheme;
  showValues: boolean;
}

export interface ParetoTileConfig {
  datasetId: string;
  categoryColumn: string;
  valueColumn: string;    // empty = count occurrences of categoryColumn
  title: string;
  yLabel: string;
  showPercentage: boolean;
}

export interface FunnelTileConfig {
  datasetId: string;
  nameColumn: string;        // unit labels (wards, trusts, etc.)
  numeratorColumn: string;   // e.g., patients meeting standard
  denominatorColumn: string; // e.g., total patients
  title: string;
  yLabel: string;
  asPercentage: boolean;     // display y-axis as 0-100 (true) or 0-1 (false)
  color: string;             // fill for conforming units
}

export interface RunTileConfig {
  datasetId: string;
  dateColumn: string;
  valueColumn: string;
  title: string;
  xLabel?: string;
  yLabel: string;
  annotationIds?: string[];
}

export interface ImageTileConfig {
  dataUrl: string;     // base64 data URL (empty = no image yet)
  title: string;       // optional label shown beneath the image
  objectFit: 'contain' | 'cover' | 'fill';
}

export interface ConditionalFormat {
  column: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  color: 'red' | 'amber' | 'green';
}

export interface DataTableTileConfig {
  datasetId: string;
  title: string;
  visibleColumns: string[];    // empty = show all dataset columns
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  conditionalFormats: ConditionalFormat[];
}

export interface WaterfallTileConfig {
  datasetId: string;
  labelColumn: string;
  valueColumn: string;
  subtotalColumn: string;   // column with truthy values flagging subtotal/total bars; empty = none
  title: string;
  positiveColor: string;
  negativeColor: string;
  subtotalColor: string;
}

export interface PyramidTileConfig {
  datasetId: string;
  ageBandColumn: string;
  maleColumn: string;
  femaleColumn: string;
  title: string;
  asPercentage: boolean;
  maleColor: string;
  femaleColor: string;
}

export interface BoxPlotTileConfig {
  datasetId: string;
  valueColumn: string;
  groupColumn: string;   // empty = single box across all rows
  title: string;
  yLabel: string;
  showOutliers: boolean;
  color: string;
}

export interface CalendarHeatmapTileConfig {
  datasetId: string;
  dateColumn: string;
  valueColumn: string;   // empty = count rows per day
  title: string;
  colorScheme: HeatmapColorScheme;
}

export interface GanttTileConfig {
  datasetId: string;
  labelColumn: string;    // task/milestone row labels
  startColumn: string;    // start date column
  endColumn: string;      // end date column
  colorColumn: string;    // optional — category or status for colouring bars
  title: string;
  showToday: boolean;     // draw a vertical "today" line
  colors: string[];       // palette for categories
}

export interface TitleTileConfig {
  title: string;
  subtitle: string;
  accent: string;
  alignment: 'left' | 'center';
  backgroundKind: 'white' | 'accent';
}

export interface SectionTileConfig {
  label: string;
  borderColor: string;
  backgroundColor: string;
}

export interface ScorecardRowConfig {
  label: string;
  unit: string;
  higherIsBetter: boolean;
  greenThreshold: number;
  amberThreshold: number;
  decimalPlaces: number;
}

export interface ScorecardTileConfig {
  datasetId: string;
  labelColumn: string;
  periodColumns: string[];
  title: string;
  showTrend: boolean;
  rowConfigs: ScorecardRowConfig[];
}

export type TileConfig = SpcTileConfig | KpiTileConfig | TextTileConfig | BarTileConfig | LineTileConfig | DataTableTileConfig | ImageTileConfig | RunTileConfig | ParetoTileConfig | HeatmapTileConfig | CalendarHeatmapTileConfig | PieTileConfig | AreaTileConfig | ScatterTileConfig | FunnelTileConfig | GanttTileConfig | WaterfallTileConfig | PyramidTileConfig | BoxPlotTileConfig | TitleTileConfig | SectionTileConfig | ScorecardTileConfig;

export interface DrillThrough {
  enabled: boolean;
  targetType: 'filteredView' | 'linkedDashboard';
  targetDashboardId: string | null;
  filterColumn: string | null;
}

export interface ChartConfig {
  id: string;
  type: TileKind;
  name: string;
  datasetId: string | null;
  config: TileConfig;
  themeOverride: Partial<DashboardTheme> | null;
  drillThrough: DrillThrough;
  details?: TileDetails;
}

export type PaletteKind = 'nhs' | 'monochrome' | 'pastel' | 'highContrast' | 'custom';
export type FontSizeScale = 'small' | 'medium' | 'large';
export type BackgroundKind = 'white' | 'lightGrey' | 'dark';
export type TileBorderRadius = 'none' | 'small' | 'medium';

export interface DashboardTheme {
  palette: PaletteKind;
  customColours: string[];
  fontFamily: string;
  fontSizeScale: FontSizeScale;
  background: BackgroundKind;
  gridLines: boolean;
  borderRadius: TileBorderRadius;
  tileBorder: boolean;
  stalenessThresholdDays: number;
  fyStartMonth: number;   // 1–12, default 4 (April). Governs FY date grouping in charts.
}

export interface DashboardTile {
  id: string;
  chartId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dashboard {
  title: string;
  theme: DashboardTheme;
  tiles: DashboardTile[];
}

export interface RagRule {
  id: string;
  name: string;
  higherIsBetter: boolean;
  greenThreshold: number;
  amberThreshold: number;
  unit: string;   // display hint e.g. "%" — used in labels only
}

export interface AnnotationDef {
  id: string;
  label: string;
  date: string;      // YYYY-MM-DD — start date (required)
  endDate: string;   // YYYY-MM-DD or '' for single-point
  color: string;
  description: string;
}

export interface StoryStep {
  id: string;
  focusTileId: string;
  commentary: string;
  duration: number; // seconds for auto-advance (0 = manual)
}

export interface StoryDef {
  id: string;
  name: string;
  steps: StoryStep[];
}

export type SlideElementType = 'chart' | 'text';

export interface SlideElement {
  id: string;
  type: SlideElementType;
  chartId: string;        // for 'chart' — references ChartConfig.id
  text: string;           // for 'text'
  x: number;              // 0–100 (% of slide width)
  y: number;              // 0–100 (% of slide height)
  w: number;              // 0–100
  h: number;              // 0–100
  fontSize: number;       // px
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  textColor: string;      // hex
  bgColor: string;        // hex or '' for transparent
}

export interface Slide {
  id: string;
  background: string;     // hex or '' for white
  elements: SlideElement[];
  notes: string;
}

export interface SlideDeck {
  id: string;
  name: string;
  slides: Slide[];
}

export interface DashboardState {
  version: '2.0';
  exportedAt: string;
  datasets: Dataset[];
  charts: ChartConfig[];
  ragRules: RagRule[];
  metrics: MetricDef[];
  annotations: AnnotationDef[];
  stories?: StoryDef[];
  slideDecks?: SlideDeck[];
  dashboard: Dashboard;
}
