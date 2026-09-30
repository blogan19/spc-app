'use client';

import { useState } from 'react';
import type { TileKind } from '@/lib/dashboard/types';

interface ChartWizardProps {
  onSelect: (kind: TileKind) => void;
  onBrowse: () => void;   // fall back to the full tile picker
  onClose: () => void;
}

// ─── Data model ───────────────────────────────────────────────────────────────

interface Option {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface Step {
  question: string;
  subtitle?: string;
  options: Option[];
  next: (optionId: string) => StepResult;
}

type StepResult =
  | { kind: 'step'; step: Step }
  | { kind: 'recommend'; chartKind: TileKind; title: string; reason: string; icon: string };

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEP_FOLLOWUP_TIMESERIES: Step = {
  question: 'Do you need to detect whether variation is statistically significant?',
  subtitle: 'Statistical process control (SPC) uses control limits to show which changes are signal vs. noise.',
  options: [
    {
      id: 'spc',
      label: 'Yes — I\'m tracking a process and want to know if changes are real',
      description: 'E.g. "Is this month\'s readmission rate a real improvement, or just random variation?"',
      icon: '📈',
    },
    {
      id: 'run',
      label: 'No — I just want to see the trend with a median line',
      description: 'Simpler than SPC. Annotates run rule violations (shifts and trends).',
      icon: '📉',
    },
    {
      id: 'line',
      label: 'I have multiple metrics to compare on the same chart',
      description: 'E.g. admissions, discharges, and length of stay over time.',
      icon: '〰️',
    },
  ],
  next(id) {
    if (id === 'spc') return { kind: 'recommend', chartKind: 'spc', icon: '📈',
      title: 'SPC Chart', reason: 'SPC charts detect whether variation in a process is common cause (expected noise) or special cause (a real change). They\'re the gold standard for healthcare quality improvement.' };
    if (id === 'run') return { kind: 'recommend', chartKind: 'run', icon: '📉',
      title: 'Run Chart', reason: 'A run chart plots data over time with a median reference line. Annotates shifts (8+ points on one side) and trends (7+ rising or falling) — simpler than SPC but still statistically grounded.' };
    return { kind: 'recommend', chartKind: 'line', icon: '〰️',
      title: 'Line Chart', reason: 'A multi-series line chart lets you compare several metrics over the same time period on a shared axis — useful for spotting relationships between measures.' };
  },
};

const STEP_FOLLOWUP_COMPARISON: Step = {
  question: 'What kind of comparison are you making?',
  options: [
    {
      id: 'pareto',
      label: 'Finding the vital few — which categories cause the most problems?',
      description: 'E.g. complaint types, incident categories, prescribing errors.',
      icon: '🔢',
    },
    {
      id: 'bar',
      label: 'Comparing categories side by side',
      description: 'Vertical or horizontal bars, one value per category.',
      icon: '📊',
    },
    {
      id: 'boxplot',
      label: 'Comparing the spread/distribution across groups',
      description: 'E.g. length of stay by ward — shows median, range, and outliers.',
      icon: '📦',
    },
  ],
  next(id) {
    if (id === 'pareto') return { kind: 'recommend', chartKind: 'pareto', icon: '🔢',
      title: 'Pareto Chart', reason: 'A Pareto chart ranks categories by frequency and adds a cumulative percentage line. The 80/20 line shows which few categories account for most of the problem.' };
    if (id === 'boxplot') return { kind: 'recommend', chartKind: 'boxplot', icon: '📦',
      title: 'Box Plot', reason: 'A box plot shows the median, interquartile range, and outliers for each group — ideal for comparing distributions (e.g. length of stay by specialty or ward).' };
    return { kind: 'recommend', chartKind: 'bar', icon: '📊',
      title: 'Bar Chart', reason: 'A bar chart compares values across categories using vertical or horizontal bars. Simple, familiar, and effective for most categorical comparisons.' };
  },
};

const STEP_FOLLOWUP_COMPOSITION: Step = {
  question: 'Are you showing composition over time, or at a single point in time?',
  options: [
    {
      id: 'area',
      label: 'Over time — how the mix has changed month by month',
      description: 'E.g. how admission types have shifted over the past year.',
      icon: '📉',
    },
    {
      id: 'pie',
      label: 'At a point in time — slices of a whole',
      description: 'E.g. proportion of complaint categories last quarter.',
      icon: '🥧',
    },
  ],
  next(id) {
    if (id === 'area') return { kind: 'recommend', chartKind: 'area', icon: '📉',
      title: 'Stacked Area Chart', reason: 'A stacked area chart shows how the composition of a total changes over time — each band represents a category\'s contribution.' };
    return { kind: 'recommend', chartKind: 'pie', icon: '🥧',
      title: 'Pie / Donut Chart', reason: 'A pie or donut chart shows how a total is divided into parts at a single point in time. Works best with fewer than 7 categories.' };
  },
};

const STEP_FOLLOWUP_HEATMAP: Step = {
  question: 'What structure does your data have?',
  options: [
    {
      id: 'heatmap',
      label: 'A grid — rows (e.g. wards) and columns (e.g. days of week)',
      description: 'Each cell coloured by a numeric value.',
      icon: '🌡️',
    },
    {
      id: 'scatter',
      label: 'Two numeric variables — does one predict the other?',
      description: 'E.g. does A&E attendance predict admissions?',
      icon: '⚬',
    },
  ],
  next(id) {
    if (id === 'heatmap') return { kind: 'recommend', chartKind: 'heatmap', icon: '🌡️',
      title: 'Heatmap', reason: 'A heatmap shows a grid of values coloured by intensity — ideal for spotting patterns across two categorical dimensions, such as ward by day of week.' };
    return { kind: 'recommend', chartKind: 'scatter', icon: '⚬',
      title: 'Scatter Plot', reason: 'A scatter plot places each data point on two numeric axes, revealing correlations or clusters. Add a colour or size dimension for richer analysis.' };
  },
};

const STEP_1: Step = {
  question: 'What are you trying to show?',
  subtitle: 'Your answer will determine the best chart type for your data.',
  options: [
    { id: 'timeseries', label: 'How something has changed over time', description: 'E.g. monthly attendances, sickness rates, compliance scores', icon: '📅' },
    { id: 'comparison', label: 'How categories compare to each other', description: 'E.g. complaint types, ward activity, specialty waiting times', icon: '📊' },
    { id: 'composition', label: 'What makes up a whole', description: 'E.g. proportion of admissions by type, complaint category split', icon: '🥧' },
    { id: 'relationship', label: 'Whether two things are related or correlated', description: 'E.g. does staffing level predict patient satisfaction?', icon: '⚬' },
    { id: 'benchmarking', label: 'How my organisation compares to others', description: 'E.g. our readmission rate vs. the national average', icon: '🏥' },
    { id: 'spc', label: 'Whether a process is in control (quality improvement)', description: 'I\'m using the Model for Improvement — I need statistical process control', icon: '📈' },
  ],
  next(id) {
    if (id === 'timeseries') return { kind: 'step', step: STEP_FOLLOWUP_TIMESERIES };
    if (id === 'comparison')  return { kind: 'step', step: STEP_FOLLOWUP_COMPARISON };
    if (id === 'composition') return { kind: 'step', step: STEP_FOLLOWUP_COMPOSITION };
    if (id === 'relationship') return { kind: 'step', step: STEP_FOLLOWUP_HEATMAP };
    if (id === 'benchmarking') return { kind: 'recommend', chartKind: 'funnel', icon: '🏥',
      title: 'Funnel Plot', reason: 'A funnel plot benchmarks each organisational unit against the pooled average, with control limits that widen for smaller denominators. Units outside the limits are statistical outliers — not necessarily "better" or "worse" without further investigation.' };
    // spc
    return { kind: 'recommend', chartKind: 'spc', icon: '📈',
      title: 'SPC Chart', reason: 'SPC charts are designed for quality improvement. They distinguish common cause variation (background noise) from special cause variation (a real signal), guiding whether to act on individual data points or change the whole system.' };
  },
};

// ─── Recommendation display ───────────────────────────────────────────────────

const CHART_MORE_INFO: Partial<Record<TileKind, string>> = {
  spc: 'Supports XmR (measurement data), P chart (proportions), C chart (counts), and U chart (rates).',
  run: 'Annotates shifts and trends automatically using run rules from NHS Making Data Count guidance.',
  line: 'Supports multiple series, reference lines, and optional data point markers.',
  bar: 'Vertical or horizontal orientation. Supports target/threshold reference lines.',
  pareto: 'Bars sorted by frequency with a cumulative % line and configurable 80/20 threshold line.',
  pie: 'Configurable inner radius (pie vs. donut). Groups small slices into "Other" automatically.',
  area: 'Supports stacked and non-stacked variants. Shares column mapping with the Line chart.',
  scatter: 'Optional colour dimension (categorical) and bubble size dimension.',
  funnel: 'Binomial control limits — wider for smaller denominators (fewer patients). Outlier labels shown.',
  heatmap: 'Sequential and diverging colour schemes. Cell value labels toggle.',
  boxplot: 'Shows Q1–Q3 box, median line, whiskers, and optional outliers (1.5× IQR).',
};

function Recommendation({ chartKind, title, reason, icon, onUse, onBack, onBrowse }: {
  chartKind: TileKind;
  title: string;
  reason: string;
  icon: string;
  onUse: () => void;
  onBack: () => void;
  onBrowse: () => void;
}) {
  const extra = CHART_MORE_INFO[chartKind];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 p-5 bg-indigo-50 border border-blue-200 rounded-xl">
        <span className="text-4xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Recommended</p>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{reason}</p>
          {extra && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">{extra}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUse}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
        >
          Use this chart →
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          ← Change my answer
        </button>
        <span className="text-gray-200">|</span>
        <button type="button" onClick={onBrowse} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Browse all chart types
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChartWizard({ onSelect, onBrowse, onClose }: ChartWizardProps) {
  type HistoryItem =
    | { kind: 'step'; step: Step }
    | { kind: 'recommend'; chartKind: TileKind; title: string; reason: string; icon: string };

  const [history, setHistory] = useState<HistoryItem[]>([{ kind: 'step', step: STEP_1 }]);
  const current = history[history.length - 1];

  const handleOption = (optionId: string) => {
    if (current.kind !== 'step') return;
    const result = current.step.next(optionId);
    setHistory((h) => [...h, result]);
  };

  const handleBack = () => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {history.length > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Go back"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">Help me choose a chart</h2>
              <div className="flex gap-1 mt-1">
                {history.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === history.length - 1 ? 'w-4 bg-indigo-600' : 'w-1 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {current.kind === 'step' && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{current.step.question}</p>
              {current.step.subtitle && (
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{current.step.subtitle}</p>
              )}
              {!current.step.subtitle && <div className="mb-3" />}
              <div className="space-y-2">
                {current.step.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOption(opt.id)}
                    className="w-full text-left flex items-start gap-3 p-3.5 rounded-xl border border-gray-200
                               hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                  >
                    {opt.icon && <span className="text-xl flex-shrink-0 mt-0.5">{opt.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 leading-snug">
                        {opt.label}
                      </p>
                      {opt.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
                      )}
                    </div>
                    <span className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5">
                      →
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button type="button" onClick={onBrowse} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                  Browse all chart types instead
                </button>
              </div>
            </div>
          )}

          {current.kind === 'recommend' && (
            <Recommendation
              chartKind={current.chartKind}
              title={current.title}
              reason={current.reason}
              icon={current.icon}
              onUse={() => onSelect(current.chartKind)}
              onBack={handleBack}
              onBrowse={onBrowse}
            />
          )}
        </div>
      </div>
    </div>
  );
}
