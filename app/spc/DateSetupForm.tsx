'use client';
// Step-by-step setup wizard for a brand-new SPC chart.
//
// Flow:
//   Step 0 — Pick a starting point (Empty chart / Upload spreadsheet).
//   Empty path:
//     Step 1 — Chart details (title required + description + axis labels)
//     Step 2 — Cadence + date range → Create chart.
//   Upload path:
//     Step 1 — Drop / pick a file. (Auto-fills suggestions from filename.)
//     Step 2 — Review details, column mapping and detected cadence.
//     Step 3 — Aggregation plan → Create chart from data.
//
// All persistent state lives at the top of this component so the user
// can step Back/Continue freely without losing what they've typed.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  daysSince,
  defaultSpanDaysForIncrement,
  formatDateForAxis,
  generateDateRows,
  todayISO,
} from '@/lib/project/dateRange';
import {
  AGGREGATOR_HINTS,
  AGGREGATOR_LABELS,
  aggregateRows,
  aggregationStats,
  bucketFor,
  type Aggregator,
} from '@/lib/project/aggregate';
import {
  applyMapping,
  guessMapping,
  parseCsv,
  type ColumnMapping,
  type ParsedCsv,
} from '@/lib/project/csv';
import {
  classifyColumn,
  findCellIssues,
  type CellIssue,
  type ColumnType,
} from '@/lib/project/columnType';
import {
  suggestIncrementForData,
  suggestTitleFromFilename,
  type IncrementSuggestion,
} from '@/lib/project/suggest';
import {
  MEASURE_TEMPLATES,
  TEMPLATE_CATEGORY_ORDER,
  type MeasureTemplate,
  type TemplateCategory,
} from '@/lib/project/templates';
import type {
  AimDirection,
  ChartKind,
  ChartSettings,
  Increment,
  MeasureRow,
} from '@/lib/project/types';

export interface SetupSubmit {
  rows: MeasureRow[];
  increment: Increment;
  name: string;
  settings: Pick<ChartSettings, 'title' | 'description' | 'xAxisLabel' | 'yAxisLabel'>;
  /** Optional chart-type override — set when a template was used. */
  chartKind?: ChartKind;
  /** Optional aim override — set when a template was used. */
  aim?: AimDirection;
}

interface Props {
  onApply: (submit: SetupSubmit) => void;
}

type Mode = 'empty' | 'upload' | 'template';

const ACCEPTED_EXT = ['csv', 'xlsx'] as const;
const ACCEPT_ATTR =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

async function readSpreadsheetAsCsv(file: File): Promise<string> {
  const ext = fileExtension(file.name);
  if (ext === 'csv') return file.text();
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('The workbook has no sheets.');
  return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
}

export default function DateSetupForm({ onApply }: Props) {
  // Step 0 = mode picker, with `mode` null. Once mode is set the user
  // is on step 1 of the chosen path.
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);

  // Shared form state (used by every path).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [increment, setIncrement] = useState<Increment>('monthly');

  // Template-path-only state. When a template is picked we also stash
  // its chartKind and aim so they can be applied via setMeasureSetup
  // when the user finishes the wizard.
  const [pickedTemplate, setPickedTemplate] = useState<MeasureTemplate | null>(null);

  // Upload-path-only state.
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [parseError, setParseError] = useState('');
  const [aggregator, setAggregator] = useState<Aggregator>('mean');
  const [aggregationChoice, setAggregationChoice] = useState<'aggregate' | 'asis'>(
    'aggregate',
  );

  // Touched flags — spreadsheet suggestions only fill untouched fields.
  const [touched, setTouched] = useState({
    title: false,
    xAxisLabel: false,
    yAxisLabel: false,
    increment: false,
  });
  const touchTitle = () => setTouched((t) => ({ ...t, title: true }));
  const touchX = () => setTouched((t) => ({ ...t, xAxisLabel: true }));
  const touchY = () => setTouched((t) => ({ ...t, yAxisLabel: true }));
  const touchInc = () => setTouched((t) => ({ ...t, increment: true }));

  const totalSteps =
    mode === 'empty' ? 2 : mode === 'upload' ? 3 : mode === 'template' ? 3 : 0;

  const pickMode = (m: Mode) => {
    setMode(m);
    setStep(1);
  };

  const pickTemplate = (template: MeasureTemplate) => {
    setPickedTemplate(template);
    // Overwrite every detail field — the user wants the template's
    // values. They can still edit on the next step before continuing.
    setTitle(template.name);
    setDescription(template.description);
    setXAxisLabel(template.xAxisLabel);
    setYAxisLabel(template.yAxisLabel);
    setIncrement(template.defaultIncrement);
    setStep(2);
  };

  const back = () => {
    if (step <= 1) {
      // Going back from step 1 returns to the mode picker, keeping the
      // user's typed values so they can flip to the other path without
      // re-typing.
      setMode(null);
      setStep(0);
    } else {
      setStep((s) => s - 1);
    }
  };

  // Track which file we've already auto-advanced from so we don't push
  // the user forward again after they manually go back to step 1.
  const autoAdvancedFor = useRef<File | null>(null);
  useEffect(() => {
    if (
      mode === 'upload' &&
      step === 1 &&
      parsed &&
      file &&
      autoAdvancedFor.current !== file
    ) {
      autoAdvancedFor.current = file;
      setStep(2);
    }
  }, [mode, step, parsed, file]);

  // ---- file parse on upload path ---------------------------------------
  useEffect(() => {
    if (!file) {
      setParsed(null);
      setMapping({});
      setParseError('');
      return;
    }
    let cancelled = false;
    (async () => {
      setParseError('');
      try {
        if (!ACCEPTED_EXT.includes(fileExtension(file.name) as 'csv' | 'xlsx')) {
          throw new Error('Please pick a .csv or .xlsx file.');
        }
        const text = await readSpreadsheetAsCsv(file);
        if (!text || !text.trim()) {
          throw new Error('The file is empty.');
        }
        const p = parseCsv(text);
        if (cancelled) return;
        if (p.headers.length === 0) {
          throw new Error('No header row was found. The first row of the spreadsheet should be column names.');
        }
        if (p.rows.length === 0) {
          throw new Error('No data rows were found beneath the header.');
        }
        if (p.headers.length < 2) {
          throw new Error(
            'The spreadsheet has only one column. SPC needs at least two: one for dates and one for values.',
          );
        }
        setParsed(p);
        setMapping(guessMapping(p.headers));
        if (!touched.title) {
          const suggested = suggestTitleFromFilename(file.name);
          if (suggested) setTitle(suggested);
        }
      } catch (err) {
        if (!cancelled) {
          setParsed(null);
          setParseError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // ---- mapping → label suggestions -------------------------------------
  useEffect(() => {
    if (!mapping.date && !mapping.value) return;
    if (mapping.date && !touched.xAxisLabel) setXAxisLabel(mapping.date);
    if (mapping.value && !touched.yAxisLabel) setYAxisLabel(mapping.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping.date, mapping.value]);

  // ---- raw rows + increment detection ----------------------------------
  const rawRows = useMemo<MeasureRow[]>(() => {
    if (!parsed || !mapping.date || !mapping.value) return [];
    const m: ColumnMapping = {
      date: mapping.date,
      value: mapping.value,
      denominator: mapping.denominator,
      commentTitle: mapping.commentTitle,
      commentContent: mapping.commentContent,
    };
    return applyMapping(parsed, m)
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [parsed, mapping]);

  // Smart increment suggestion: derives the natural cadence from the
  // gap between dates, then bumps it coarser if there'd be too many
  // rows to plot cleanly. The same suggestion drives both the default
  // value and the explanatory message in the Review step.
  const incrementSuggestion = useMemo<IncrementSuggestion | null>(
    () => (rawRows.length > 0 ? suggestIncrementForData(rawRows) : null),
    [rawRows],
  );

  useEffect(() => {
    if (!incrementSuggestion || touched.increment) return;
    setIncrement(incrementSuggestion.suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incrementSuggestion?.suggested]);

  const stats = useMemo(
    () => (rawRows.length > 0 ? aggregationStats(rawRows, increment) : null),
    [rawRows, increment],
  );
  const willAggregate = (stats?.bucketsWithDuplicates ?? 0) > 0;

  const effectiveAggregator: Aggregator =
    aggregationChoice === 'asis' ? 'first' : aggregator;
  const finalRows = useMemo<MeasureRow[]>(() => {
    if (rawRows.length === 0) return [];
    return aggregateRows(rawRows, increment, effectiveAggregator);
  }, [rawRows, increment, effectiveAggregator]);

  const titleTrim = title.trim();
  const titleValid = titleTrim.length > 0;

  const apply = (rows: MeasureRow[]) => {
    onApply({
      rows,
      increment,
      name: titleTrim,
      settings: {
        title: titleTrim,
        description: description.trim(),
        xAxisLabel: xAxisLabel.trim(),
        yAxisLabel: yAxisLabel.trim(),
      },
      // Templates also dictate chart kind + aim so the user lands on a
      // properly configured measure (e.g. a P chart with the right
      // direction). When the user picked Empty/Upload these are
      // undefined and the measure keeps its existing defaults.
      ...(pickedTemplate
        ? { chartKind: pickedTemplate.chartKind, aim: pickedTemplate.aim }
        : {}),
    });
  };

  // ---- step body picker -------------------------------------------------
  let body: React.ReactNode;
  if (step === 0 || mode === null) {
    body = <ModeStep onPick={pickMode} />;
  } else if (mode === 'empty' && step === 1) {
    body = (
      <DetailsStep
        title={title}
        setTitle={(v) => {
          touchTitle();
          setTitle(v);
        }}
        description={description}
        setDescription={setDescription}
        xAxisLabel={xAxisLabel}
        setXAxisLabel={(v) => {
          touchX();
          setXAxisLabel(v);
        }}
        yAxisLabel={yAxisLabel}
        setYAxisLabel={(v) => {
          touchY();
          setYAxisLabel(v);
        }}
        canContinue={titleValid}
        onBack={back}
        onContinue={() => setStep(2)}
      />
    );
  } else if (mode === 'empty' && step === 2) {
    body = (
      <EmptyRangeStep
        increment={increment}
        setIncrement={(v) => {
          touchInc();
          setIncrement(v);
        }}
        onBack={back}
        onCreate={(rows) => apply(rows)}
      />
    );
  } else if (mode === 'upload' && step === 1) {
    body = (
      <UploadFileStep
        file={file}
        setFile={setFile}
        parsed={parsed}
        parseError={parseError}
        canContinue={Boolean(parsed)}
        onBack={back}
        onContinue={() => setStep(2)}
      />
    );
  } else if (mode === 'upload' && step === 2) {
    body = (
      <UploadReviewStep
        parsed={parsed!}
        setParsed={setParsed}
        mapping={mapping}
        setMapping={setMapping}
        title={title}
        setTitle={(v) => {
          touchTitle();
          setTitle(v);
        }}
        description={description}
        setDescription={setDescription}
        xAxisLabel={xAxisLabel}
        setXAxisLabel={(v) => {
          touchX();
          setXAxisLabel(v);
        }}
        yAxisLabel={yAxisLabel}
        setYAxisLabel={(v) => {
          touchY();
          setYAxisLabel(v);
        }}
        increment={increment}
        setIncrement={(v) => {
          touchInc();
          setIncrement(v);
        }}
        canContinue={titleValid && rawRows.length > 0}
        rawRowCount={rawRows.length}
        incrementSuggestion={incrementSuggestion}
        userPickedIncrement={touched.increment}
        rawRows={rawRows}
        onBack={back}
        onContinue={() => setStep(3)}
      />
    );
  } else if (mode === 'upload' && step === 3) {
    body = (
      <UploadPlanStep
        stats={stats!}
        increment={increment}
        choice={aggregationChoice}
        setChoice={setAggregationChoice}
        aggregator={aggregator}
        setAggregator={setAggregator}
        willAggregate={willAggregate}
        firstRaw={rawRows[0]}
        firstFinal={finalRows[0]}
        finalRowCount={finalRows.length}
        rawRows={rawRows}
        effectiveAggregator={effectiveAggregator}
        canCreate={titleValid && finalRows.length > 0}
        onBack={back}
        onCreate={() => apply(finalRows)}
      />
    );
  } else if (mode === 'template' && step === 1) {
    body = <TemplatePickerStep onPick={pickTemplate} onBack={back} />;
  } else if (mode === 'template' && step === 2) {
    body = (
      <DetailsStep
        title={title}
        setTitle={(v) => {
          touchTitle();
          setTitle(v);
        }}
        description={description}
        setDescription={setDescription}
        xAxisLabel={xAxisLabel}
        setXAxisLabel={(v) => {
          touchX();
          setXAxisLabel(v);
        }}
        yAxisLabel={yAxisLabel}
        setYAxisLabel={(v) => {
          touchY();
          setYAxisLabel(v);
        }}
        canContinue={titleValid}
        onBack={back}
        onContinue={() => setStep(3)}
        templateInfo={pickedTemplate}
      />
    );
  } else if (mode === 'template' && step === 3) {
    body = (
      <EmptyRangeStep
        increment={increment}
        setIncrement={(v) => {
          touchInc();
          setIncrement(v);
        }}
        onBack={back}
        onCreate={(rows) => apply(rows)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-5 sm:p-7 max-w-5xl mx-auto border-t-4 border-blue-500">
      {step > 0 && (
        <button
          type="button"
          onClick={back}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md px-3 py-1.5 transition-colors"
        >
          <span aria-hidden>←</span>
          Back
        </button>
      )}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Create a new SPC chart
          </h2>
          {totalSteps > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Step {step} of {totalSteps}
              {' — '}
              {stepLabel(mode, step)}
            </p>
          )}
        </div>
        {totalSteps > 0 && <StepDots total={totalSteps} current={step} />}
      </header>

      <div className="mt-6">{body}</div>

      <style jsx>{`
        :global(.range-thumb-start::-webkit-slider-thumb),
        :global(.range-thumb-end::-webkit-slider-thumb) {
          pointer-events: auto;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgb(37 99 235);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }
        :global(.range-thumb-start::-moz-range-thumb),
        :global(.range-thumb-end::-moz-range-thumb) {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgb(37 99 235);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }
        :global(.range-thumb-start::-webkit-slider-runnable-track),
        :global(.range-thumb-end::-webkit-slider-runnable-track) {
          background: transparent;
        }
      `}</style>
    </div>
  );
}

function stepLabel(mode: Mode | null, step: number): string {
  if (!mode) return '';
  if (mode === 'empty') return step === 1 ? 'chart details' : 'cadence and date range';
  if (mode === 'upload') {
    if (step === 1) return 'upload spreadsheet';
    if (step === 2) return 'review details';
    return 'aggregation plan';
  }
  // template
  if (step === 1) return 'pick a template';
  if (step === 2) return 'review details';
  return 'cadence and date range';
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={`h-2 w-6 rounded-full transition-colors ${
            n <= current ? 'bg-blue-500' : 'bg-gray-200'
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}

// --- Step 0: pick mode ----------------------------------------------------

function ModeStep({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">How would you like to start?</h3>
      <p className="text-sm text-gray-600 mt-1">
        Start from a template, build from scratch, or load existing data.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ModeCard
          onClick={() => onPick('template')}
          title="From a template"
          hint="Pre-built measures for the typical QI metrics — falls, DNA, length of stay…"
          accent
        />
        <ModeCard
          onClick={() => onPick('empty')}
          title="Empty chart"
          hint="Pick a cadence and date range; we'll generate empty rows for you to fill in."
        />
        <ModeCard
          onClick={() => onPick('upload')}
          title="Upload spreadsheet"
          hint="Drag a .csv or .xlsx file. We'll suggest title, axis labels and cadence."
        />
      </div>
    </div>
  );
}

function ModeCard({
  onClick,
  title,
  hint,
  accent,
}: {
  onClick: () => void;
  title: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border-2 rounded-lg p-5 transition-colors group ${
        accent
          ? 'border-blue-300 bg-blue-50/30 hover:border-blue-500'
          : 'border-gray-200 hover:border-blue-500'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
          {title}
        </span>
        <span className="text-blue-500 group-hover:translate-x-1 transition-transform">→</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{hint}</p>
    </button>
  );
}

// --- Step 1 (empty): details ---------------------------------------------

function DetailsStep({
  title,
  setTitle,
  description,
  setDescription,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,
  canContinue,
  onBack,
  onContinue,
  templateInfo,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (v: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (v: string) => void;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  templateInfo?: MeasureTemplate | null;
}) {
  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Chart details</h3>
      <p className="text-sm text-gray-600 mt-1">
        {templateInfo
          ? <>Pre-filled from the <strong>{templateInfo.name}</strong> template — edit any field below.</>
          : 'Give your chart a name and label its axes.'}
      </p>
      {templateInfo && (
        <div className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs rounded border border-blue-200 bg-blue-50 px-3 py-1.5">
          <span className="font-medium text-blue-900">Template:</span>
          <span className="text-blue-900">{templateInfo.name}</span>
          <span className="text-blue-700">·</span>
          <span className="text-blue-900">{templateInfo.chartKind} chart</span>
          <span className="text-blue-700">·</span>
          <span className="text-blue-900">aim: {templateInfo.aim}</span>
          {templateInfo.denominatorLabel && (
            <>
              <span className="text-blue-700">·</span>
              <span className="text-blue-900">denominator: {templateInfo.denominatorLabel}</span>
            </>
          )}
        </div>
      )}
      <DetailsFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        xAxisLabel={xAxisLabel}
        setXAxisLabel={setXAxisLabel}
        yAxisLabel={yAxisLabel}
        setYAxisLabel={setYAxisLabel}
      />
      <NavRow
        onBack={onBack}
        primaryLabel="Continue →"
        primaryDisabled={!canContinue}
        primaryDisabledHint={canContinue ? undefined : 'A title is required.'}
        onPrimary={onContinue}
      />
    </div>
  );
}

// --- Step 1 (template): pick a template ----------------------------------

function TemplatePickerStep({
  onPick,
  onBack,
}: {
  onPick: (t: MeasureTemplate) => void;
  onBack: () => void;
}) {
  const grouped = useMemo(() => {
    const byCategory = new Map<TemplateCategory, MeasureTemplate[]>();
    for (const t of MEASURE_TEMPLATES) {
      const arr = byCategory.get(t.category) ?? [];
      arr.push(t);
      byCategory.set(t.category, arr);
    }
    return TEMPLATE_CATEGORY_ORDER
      .filter((c) => byCategory.has(c))
      .map((c) => ({ category: c, templates: byCategory.get(c)! }));
  }, []);

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Pick a template</h3>
      <p className="text-sm text-gray-600 mt-1">
        Each template sets the right chart type, aim direction, axis labels
        and suggested cadence. Pick one to get started — you can still edit
        everything before creating the chart.
      </p>
      <div className="mt-5 space-y-5">
        {grouped.map(({ category, templates }) => (
          <section key={category}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t)}
                  className="text-left border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded p-3 transition-colors group"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                      {t.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 whitespace-nowrap">
                      {t.chartKind} · {t.defaultIncrement} · {t.aim}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 leading-snug">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-start pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md px-3 py-1.5 transition-colors"
        >
          <span aria-hidden>←</span>
          Back
        </button>
      </div>
    </div>
  );
}

// --- Step 2 (empty): cadence + range -------------------------------------

function EmptyRangeStep({
  increment,
  setIncrement,
  onBack,
  onCreate,
}: {
  increment: Increment;
  setIncrement: (v: Increment) => void;
  onBack: () => void;
  onCreate: (rows: MeasureRow[]) => void;
}) {
  const epoch = useMemo(() => addDays(todayISO(), -365 * 15), []);
  const horizon = useMemo(() => addDays(todayISO(), 365 * 5), []);
  const totalDays = useMemo(() => daysSince(epoch, horizon), [epoch, horizon]);

  const [endISO, setEndISO] = useState(() => todayISO());
  const [startISO, setStartISO] = useState(() =>
    addDays(todayISO(), -defaultSpanDaysForIncrement(increment)),
  );

  useEffect(() => {
    setStartISO(addDays(endISO, -defaultSpanDaysForIncrement(increment)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [increment]);

  const rows = useMemo(
    () => generateDateRows(startISO, endISO, increment),
    [startISO, endISO, increment],
  );
  const datesValid = rows.length > 0;
  const firstLabel = datesValid ? formatDateForAxis(rows[0].date, increment) : '';
  const lastLabel =
    datesValid && rows.length > 1
      ? formatDateForAxis(rows[rows.length - 1].date, increment)
      : firstLabel;

  const startDay = Math.max(0, Math.min(totalDays, daysSince(epoch, startISO)));
  const endDay = Math.max(0, Math.min(totalDays, daysSince(epoch, endISO)));
  const startPct = (startDay / totalDays) * 100;
  const endPct = (endDay / totalDays) * 100;
  const onStartDay = (day: number) => setStartISO(addDays(epoch, Math.min(day, endDay)));
  const onEndDay = (day: number) => setEndISO(addDays(epoch, Math.max(day, startDay)));

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Cadence and date range</h3>
      <p className="text-sm text-gray-600 mt-1">
        Pick how often you sample, then the window the chart should cover.
      </p>

      <IncrementGrid current={increment} onChange={setIncrement} />

      <div className="mt-6">
        <label className="text-sm font-medium text-gray-700">Date range</label>
        <div className="relative h-10 mt-3">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded bg-gray-200" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded bg-blue-500"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
          />
          <input
            type="range"
            min={0}
            max={totalDays}
            value={startDay}
            onChange={(e) => onStartDay(Number(e.target.value))}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none range-thumb-start"
            aria-label="Start date"
          />
          <input
            type="range"
            min={0}
            max={totalDays}
            value={endDay}
            onChange={(e) => onEndDay(Number(e.target.value))}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none range-thumb-end"
            aria-label="End date"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <label className="text-sm">
            <span className="text-gray-600">Start</span>
            <input
              type="date"
              value={startISO}
              onChange={(e) => e.target.value && setStartISO(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-600">End</span>
            <input
              type="date"
              value={endISO}
              onChange={(e) => e.target.value && setEndISO(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700">
        {datesValid ? (
          <>
            <span className="font-medium">{rows.length}</span> row
            {rows.length === 1 ? '' : 's'} will be generated
            {rows.length >= 2 && (
              <>
                : <span className="font-medium">{firstLabel}</span> →{' '}
                <span className="font-medium">{lastLabel}</span>
              </>
            )}
            .
          </>
        ) : (
          <span className="text-amber-700">End date must be on or after the start date.</span>
        )}
      </div>

      <NavRow
        onBack={onBack}
        primaryLabel="Create chart →"
        primaryDisabled={!datesValid}
        onPrimary={() => onCreate(rows)}
      />
    </div>
  );
}

// --- Step 1 (upload): file picker ----------------------------------------

function UploadFileStep({
  file,
  setFile,
  parsed,
  parseError,
  canContinue,
  onBack,
  onContinue,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  parsed: ParsedCsv | null;
  parseError: string;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Upload spreadsheet</h3>
      <p className="text-sm text-gray-600 mt-1">
        Drag a <strong>.csv</strong> or <strong>.xlsx</strong> file here. We&rsquo;ll
        suggest the title, axis labels and cadence based on what&rsquo;s inside.
      </p>

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          className={`mt-6 border-2 border-dashed rounded-lg p-10 text-center text-sm ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <p className="text-gray-700 mb-2">Drop a file here, or</p>
          <label className="inline-block px-3 py-1.5 rounded bg-blue-600 text-white text-sm cursor-pointer hover:bg-blue-700">
            Choose file…
            <input
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3 border border-gray-200 bg-gray-50 rounded px-3 py-3 text-sm">
          <span>
            <span className="font-medium text-gray-900">{file.name}</span>
            {parsed && (
              <span className="text-gray-500"> · {parsed.rows.length} input rows</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-xs text-blue-700 hover:underline"
          >
            Pick a different file
          </button>
        </div>
      )}

      {parseError && <p className="mt-3 text-sm text-red-600">{parseError}</p>}

      <NavRow
        onBack={onBack}
        primaryLabel="Continue →"
        primaryDisabled={!canContinue}
        primaryDisabledHint={
          file && !parsed && !parseError
            ? 'Reading the file…'
            : !file
              ? 'Pick a file to continue.'
              : undefined
        }
        onPrimary={onContinue}
      />
    </div>
  );
}

// --- Step 2 (upload): review ---------------------------------------------

// Roles a single column can play in the chart. Mutually exclusive
// across columns — assigning a role to a new column clears it on the
// previous one.
type ColumnRole = 'none' | 'date' | 'value' | 'denominator' | 'commentTitle' | 'commentContent';

function roleOfColumn(header: string, mapping: Partial<ColumnMapping>): ColumnRole {
  if (mapping.date === header) return 'date';
  if (mapping.value === header) return 'value';
  if (mapping.denominator === header) return 'denominator';
  if (mapping.commentTitle === header) return 'commentTitle';
  if (mapping.commentContent === header) return 'commentContent';
  return 'none';
}

function assignRole(
  mapping: Partial<ColumnMapping>,
  header: string,
  newRole: ColumnRole,
): Partial<ColumnMapping> {
  const next = { ...mapping };
  // Remove this column from whichever role it currently holds.
  if (next.date === header) delete next.date;
  if (next.value === header) delete next.value;
  if (next.denominator === header) delete next.denominator;
  if (next.commentTitle === header) delete next.commentTitle;
  if (next.commentContent === header) delete next.commentContent;
  // Then evict any other column that holds the new role (since each
  // role can only land on one column at a time).
  if (newRole !== 'none') {
    if (newRole === 'date') next.date = header;
    else if (newRole === 'value') next.value = header;
    else if (newRole === 'denominator') next.denominator = header;
    else if (newRole === 'commentTitle') next.commentTitle = header;
    else if (newRole === 'commentContent') next.commentContent = header;
  }
  return next;
}

function UploadReviewStep({
  parsed,
  setParsed,
  mapping,
  setMapping,
  title,
  setTitle,
  description,
  setDescription,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,
  increment,
  setIncrement,
  canContinue,
  rawRowCount,
  incrementSuggestion,
  userPickedIncrement,
  rawRows,
  onBack,
  onContinue,
}: {
  parsed: ParsedCsv;
  setParsed: (p: ParsedCsv) => void;
  mapping: Partial<ColumnMapping>;
  setMapping: (m: Partial<ColumnMapping>) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (v: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (v: string) => void;
  increment: Increment;
  setIncrement: (v: Increment) => void;
  canContinue: boolean;
  rawRowCount: number;
  incrementSuggestion: IncrementSuggestion | null;
  userPickedIncrement: boolean;
  rawRows: MeasureRow[];
  onBack: () => void;
  onContinue: () => void;
}) {
  const previewRows = parsed.rows.slice(0, 5);

  // Classify each column once. Drives:
  //   - whether the X / Y buttons are clickable on a given column
  //     (X requires a date-shaped column; Y requires a numeric one)
  //   - the per-column captions ("12 rows / 18 look like dates" etc.)
  const columnTypes = useMemo<Record<string, ColumnType>>(() => {
    const out: Record<string, ColumnType> = {};
    for (const h of parsed.headers) {
      out[h] = classifyColumn(parsed.rows.map((r) => r[h] ?? ''));
    }
    return out;
  }, [parsed.headers, parsed.rows]);

  // Issues are recomputed whenever the mapping or the underlying data
  // changes. The user can fix them in place via patchCell below.
  const issues = useMemo<CellIssue[]>(
    () => findCellIssues(parsed.rows, mapping.date, mapping.value),
    [parsed.rows, mapping.date, mapping.value],
  );

  const patchCell = (rowIndex: number, header: string, value: string) => {
    const nextRows = parsed.rows.slice();
    nextRows[rowIndex] = { ...nextRows[rowIndex], [header]: value };
    setParsed({ ...parsed, rows: nextRows });
  };

  // Bucket count per cadence — drives the "(N rows)" chip on each
  // increment option so the user can see what they'll end up with.
  const rowCounts = useMemo<Partial<Record<Increment, number>>>(() => {
    if (rawRows.length === 0) return {};
    return {
      daily: aggregationStats(rawRows, 'daily').bucketCount,
      weekly: aggregationStats(rawRows, 'weekly').bucketCount,
      monthly: aggregationStats(rawRows, 'monthly').bucketCount,
      yearly: aggregationStats(rawRows, 'yearly').bucketCount,
    };
  }, [rawRows]);

  // Validation flags shown as inline alerts.
  const hasDate = Boolean(mapping.date);
  const hasValue = Boolean(mapping.value);

  const labelHint = (forX: boolean) =>
    forX
      ? hasDate
        ? `Defaulted to the header of "${mapping.date}".`
        : 'Pick the date column above to fill this in automatically.'
      : hasValue
        ? `Defaulted to the header of "${mapping.value}".`
        : 'Pick the value column above to fill this in automatically.';

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Map your data</h3>
      <p className="text-sm text-gray-700 mt-1">
        Click <strong>X</strong> on the column with your dates and{' '}
        <strong>Y</strong> on the column with your values. We&rsquo;ve made
        initial guesses based on your column names.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {parsed.headers.map((h) => {
                const role = roleOfColumn(h, mapping);
                const isX = role === 'date';
                const isY = role === 'value';
                const isAssigned = role !== 'none';
                const colType = columnTypes[h];
                // Allow X only if the column looks like dates (or
                // already holds X — so the user can always unset).
                const canBeX = isX || colType === 'date' || colType === 'mixed';
                // Allow Y only on numeric (or mixed, where the user can
                // fix the bad cells below the table). Text columns
                // (categorical strings, free-form labels) never qualify.
                const canBeY = isY || colType === 'numeric' || colType === 'mixed';
                const colTypeReason =
                  colType === 'text'
                    ? 'this column looks like text'
                    : colType === 'empty'
                      ? 'this column is empty'
                      : `(${colType})`;
                return (
                  <th
                    key={h}
                    className={`text-left align-top p-2 border-b-2 border-gray-300 ${
                      isAssigned ? 'bg-gray-100' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs ${
                      isAssigned ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium'
                    }`}>
                      {h}
                    </div>
                    <div className="mt-1.5 inline-flex gap-1">
                      <button
                        type="button"
                        disabled={!canBeX}
                        onClick={() =>
                          setMapping(assignRole(mapping, h, isX ? 'none' : 'date'))
                        }
                        className={`text-[11px] font-medium rounded border w-7 h-6 transition-colors ${
                          isX
                            ? 'bg-gray-900 text-white border-gray-900'
                            : canBeX
                              ? 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                              : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        }`}
                        title={
                          isX
                            ? 'Click to unset'
                            : !canBeX
                              ? `This column can't be used as the date axis — ${colTypeReason}.`
                              : 'Mark this column as the date / X-axis'
                        }
                      >
                        X
                      </button>
                      <button
                        type="button"
                        disabled={!canBeY}
                        onClick={() =>
                          setMapping(assignRole(mapping, h, isY ? 'none' : 'value'))
                        }
                        className={`text-[11px] font-medium rounded border w-7 h-6 transition-colors ${
                          isY
                            ? 'bg-gray-900 text-white border-gray-900'
                            : canBeY
                              ? 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                              : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        }`}
                        title={
                          isY
                            ? 'Click to unset'
                            : !canBeY
                              ? `This column can't be used as the value axis — ${colTypeReason}.`
                              : 'Mark this column as the value / Y-axis'
                        }
                      >
                        Y
                      </button>
                    </div>
                    {(colType === 'date' || colType === 'numeric') && !isAssigned && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                        Looks like {colType === 'date' ? 'dates' : 'numbers'}
                      </div>
                    )}
                    {role === 'denominator' && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                        Auto-detected denominator
                      </div>
                    )}
                    {(role === 'commentTitle' || role === 'commentContent') && (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                        Auto-detected {role === 'commentTitle' ? 'comment title' : 'comment'}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="even:bg-gray-50/40">
                {parsed.headers.map((h) => {
                  const role = roleOfColumn(h, mapping);
                  const isAssigned = role !== 'none';
                  return (
                    <td
                      key={h}
                      className={`text-left p-2 border-b border-gray-100 text-gray-700 ${
                        isAssigned ? 'bg-gray-50' : ''
                      }`}
                    >
                      {row[h]}
                    </td>
                  );
                })}
              </tr>
            ))}
            {parsed.rows.length > previewRows.length && (
              <tr>
                <td
                  colSpan={parsed.headers.length}
                  className="px-2 py-1.5 text-xs text-gray-500 bg-gray-50"
                >
                  &hellip; showing the first {previewRows.length} of{' '}
                  {parsed.rows.length} rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inline alerts for missing / suspect mappings. */}
      <div className="mt-3 space-y-2 text-sm">
        {!hasDate && (
          <Alert tone="error">
            <strong>Pick a Date (X) column.</strong> SPC needs to know which
            column holds your time-axis values.
          </Alert>
        )}
        {!hasValue && (
          <Alert tone="error">
            <strong>Pick a Value (Y) column.</strong> SPC needs to know which
            column holds the numbers to plot.
          </Alert>
        )}
      </div>

      {issues.length > 0 && (
        <IssuesPanel issues={issues} onFix={patchCell} />
      )}

      <DetailsFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        xAxisLabel={xAxisLabel}
        setXAxisLabel={setXAxisLabel}
        yAxisLabel={yAxisLabel}
        setYAxisLabel={setYAxisLabel}
        xAxisHint={labelHint(true)}
        yAxisHint={labelHint(false)}
      />

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Increment</h4>
        {incrementSuggestion && !userPickedIncrement && (
          <div
            className={`mt-2 rounded border px-3 py-2 text-xs ${
              incrementSuggestion.willAggregate
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {incrementSuggestion.message}
          </div>
        )}
        {incrementSuggestion && userPickedIncrement && (
          <div className="mt-2 text-xs text-gray-500">
            Suggestion was <strong>{incrementSuggestion.suggested}</strong> ({incrementSuggestion.suggestedRowCount} row{incrementSuggestion.suggestedRowCount === 1 ? '' : 's'}).
          </div>
        )}
        <IncrementGrid current={increment} onChange={setIncrement} rowCounts={rowCounts} />
      </div>

      {rawRowCount === 0 && hasDate && hasValue && (
        <p className="mt-3 text-sm text-amber-700">
          None of the rows could be parsed yet — check the chosen Date column
          contains real dates.
        </p>
      )}

      <NavRow
        onBack={onBack}
        primaryLabel="Continue →"
        primaryDisabled={!canContinue}
        primaryDisabledHint={
          !canContinue ? buildBlockedHint({
            title: title.trim(),
            hasDate,
            hasValue,
            rawRowCount,
          }) : undefined
        }
        onPrimary={onContinue}
      />
    </div>
  );
}

function buildBlockedHint({
  title,
  hasDate,
  hasValue,
  rawRowCount,
}: {
  title: string;
  hasDate: boolean;
  hasValue: boolean;
  rawRowCount: number;
}): string {
  const missing: string[] = [];
  if (!title) missing.push('a title');
  if (!hasDate) missing.push('an X (date) column');
  if (!hasValue) missing.push('a Y (value) column');
  if (missing.length === 0 && rawRowCount === 0) {
    // Date+value are picked but no rows parsed — almost always because
    // the chosen date column doesn't actually contain valid dates.
    return 'No rows parsed yet — check the X column has real dates.';
  }
  if (missing.length === 0) return '';
  const joined =
    missing.length === 1
      ? missing[0]
      : missing.length === 2
        ? `${missing[0]} and ${missing[1]}`
        : `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`;
  return `Add ${joined} to continue.`;
}

function Alert({
  tone,
  children,
}: {
  tone: 'error' | 'warning';
  children: React.ReactNode;
}) {
  const palette =
    tone === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-amber-50 text-amber-900 border-amber-200';
  return (
    <div className={`rounded border px-3 py-2 ${palette}`}>{children}</div>
  );
}

function IssuesPanel({
  issues,
  onFix,
}: {
  issues: CellIssue[];
  onFix: (rowIndex: number, header: string, value: string) => void;
}) {
  const MAX_VISIBLE = 10;
  const shown = issues.slice(0, MAX_VISIBLE);
  const hidden = issues.length - shown.length;
  return (
    <section className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
      <h4 className="text-sm font-semibold text-amber-900">
        Fix {issues.length} data issue{issues.length === 1 ? '' : 's'}
      </h4>
      <p className="mt-1 text-xs text-amber-900/80">
        These rows have values that won&rsquo;t parse for the chart. Correct
        them here or leave them empty to skip the row entirely.
      </p>
      <ul className="mt-3 space-y-1.5">
        {shown.map((iss) => (
          <IssueRow
            key={`${iss.rowIndex}-${iss.header}`}
            issue={iss}
            onSave={(value) => onFix(iss.rowIndex, iss.header, value)}
          />
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-2 text-xs text-amber-900/70">
          …and {hidden} more issue{hidden === 1 ? '' : 's'} below. Fix these
          first; the panel will refresh.
        </p>
      )}
    </section>
  );
}

function IssueRow({
  issue,
  onSave,
}: {
  issue: CellIssue;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(issue.rawValue);
  // Reset the draft if the underlying issue changes (e.g. user navigated
  // away and back, or the parent re-shuffled rows).
  useEffect(() => {
    setDraft(issue.rawValue);
  }, [issue.rawValue, issue.rowIndex]);

  const reasonText =
    issue.reason === 'invalid_date'
      ? 'not a recognised date'
      : 'not a number';
  return (
    <li className="flex flex-wrap items-center gap-2 rounded bg-white border border-amber-200 px-2 py-1.5">
      <span className="text-xs text-amber-900/70 tabular-nums">
        Row {issue.rowIndex + 1}
      </span>
      <span className="text-xs text-gray-500">·</span>
      <span className="text-xs text-gray-700">
        <strong>{issue.header}</strong> {reasonText}:
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          issue.reason === 'invalid_date' ? 'YYYY-MM-DD' : 'e.g. 5.2'
        }
        className="text-xs border border-gray-300 rounded px-2 py-0.5 flex-1 min-w-[140px]"
      />
      <button
        type="button"
        onClick={() => onSave(draft.trim())}
        className="text-xs font-medium px-2 py-0.5 rounded bg-amber-600 text-white hover:bg-amber-700"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => onSave('')}
        className="text-xs text-gray-600 hover:text-gray-900"
        title="Clear this cell — the row will be skipped during analysis"
      >
        Clear
      </button>
    </li>
  );
}

// --- Step 3 (upload): aggregation + plan ---------------------------------

function UploadPlanStep({
  stats,
  increment,
  choice,
  setChoice,
  aggregator,
  setAggregator,
  willAggregate,
  firstRaw,
  firstFinal,
  finalRowCount,
  rawRows,
  effectiveAggregator,
  canCreate,
  onBack,
  onCreate,
}: {
  stats: ReturnType<typeof aggregationStats>;
  increment: Increment;
  choice: 'aggregate' | 'asis';
  setChoice: (c: 'aggregate' | 'asis') => void;
  aggregator: Aggregator;
  setAggregator: (a: Aggregator) => void;
  willAggregate: boolean;
  firstRaw: MeasureRow | undefined;
  firstFinal: MeasureRow | undefined;
  finalRowCount: number;
  rawRows: MeasureRow[];
  effectiveAggregator: Aggregator;
  canCreate: boolean;
  onBack: () => void;
  onCreate: () => void;
}) {
  const bucketLabel =
    increment === 'yearly' ? 'year'
      : increment === 'monthly' ? 'month'
        : increment === 'weekly' ? 'week'
          : 'day';

  const previewBucket =
    firstRaw && firstRaw.date ? bucketFor(firstRaw.date, increment) : '';
  const dateWillSnap = previewBucket && previewBucket !== firstRaw?.date;

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900">Aggregation plan</h3>
      <p className="text-sm text-gray-600 mt-1">
        {willAggregate
          ? `Some of your data lands in the same ${bucketLabel}. Pick how we should combine those rows.`
          : `Your data is already one row per ${bucketLabel} — no aggregation needed.`}
      </p>

      {willAggregate && (
        <>
          <div className="mt-4 space-y-2">
            <ChoiceCard
              checked={choice === 'aggregate'}
              onChoose={() => setChoice('aggregate')}
              title="Aggregate the data for me"
              hint={`Combine rows that share a ${bucketLabel}.`}
            />
            <ChoiceCard
              checked={choice === 'asis'}
              onChoose={() => setChoice('asis')}
              title="Use the data as-is"
              hint={`Keep only the first row in each ${bucketLabel}; ignore the rest.`}
            />
          </div>

          {choice === 'aggregate' && (
            <fieldset className="mt-3">
              <legend className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Combine using
              </legend>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(AGGREGATOR_LABELS) as Aggregator[]).map((a) => (
                  <label
                    key={a}
                    className={`flex flex-col rounded border px-2 py-1.5 cursor-pointer text-xs ${
                      aggregator === a
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="aggregator"
                        checked={aggregator === a}
                        onChange={() => setAggregator(a)}
                      />
                      <span className="font-medium">{AGGREGATOR_LABELS[a]}</span>
                    </span>
                    <span className="ml-5 text-[11px] text-gray-500">
                      {AGGREGATOR_HINTS[a]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}

      {willAggregate && (
        <BucketPreview
          rawRows={rawRows}
          increment={increment}
          aggregator={effectiveAggregator}
        />
      )}

      <div className="mt-5 rounded border border-blue-200 bg-blue-50 p-3 text-xs">
        <div className="font-medium text-blue-900">What will happen</div>
        <ul className="mt-1 list-disc list-inside text-blue-900 space-y-0.5">
          <li>
            <strong>{stats.inputCount}</strong> rows in →{' '}
            <strong>{finalRowCount}</strong> rows out (one per {bucketLabel}).
          </li>
          {willAggregate && choice === 'aggregate' && (
            <li>
              {stats.rowsInDuplicateBuckets} rows in {stats.bucketsWithDuplicates}{' '}
              {bucketLabel}
              {stats.bucketsWithDuplicates === 1 ? '' : 's'} will be combined using{' '}
              <strong>{AGGREGATOR_LABELS[aggregator].toLowerCase()}</strong>.
            </li>
          )}
          {willAggregate && choice === 'asis' && (
            <li>
              Where a {bucketLabel} has multiple rows we&rsquo;ll keep only the first;
              the others are discarded.
            </li>
          )}
          {dateWillSnap && firstFinal && firstRaw && (
            <li>
              Dates will snap to the start of each {bucketLabel} — e.g. row{' '}
              <code className="bg-white px-1 rounded">{firstRaw.date}</code> becomes{' '}
              <code className="bg-white px-1 rounded">{firstFinal.date}</code>.
            </li>
          )}
        </ul>
      </div>

      <NavRow
        onBack={onBack}
        primaryLabel="Create chart from data →"
        primaryDisabled={!canCreate}
        onPrimary={onCreate}
      />
    </div>
  );
}

// --- Shared atoms --------------------------------------------------------

function DetailsFields({
  title,
  setTitle,
  description,
  setDescription,
  xAxisLabel,
  setXAxisLabel,
  yAxisLabel,
  setYAxisLabel,
  xAxisHint,
  yAxisHint,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  xAxisLabel: string;
  setXAxisLabel: (v: string) => void;
  yAxisLabel: string;
  setYAxisLabel: (v: string) => void;
  xAxisHint?: string;
  yAxisHint?: string;
}) {
  const xMissing = !xAxisLabel.trim();
  const yMissing = !yAxisLabel.trim();
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm">
        <span className="text-gray-600">
          Title <span className="text-red-600">*</span>
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Daily falls per 1000 occupied bed days"
          className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
          autoFocus
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this chart measuring, and why does it matter?"
          rows={2}
          className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 resize-y"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-gray-600">X-axis label</span>
          <input
            type="text"
            value={xAxisLabel}
            onChange={(e) => setXAxisLabel(e.target.value)}
            placeholder="e.g. Month"
            className={`mt-1 w-full border rounded px-2 py-1.5 ${
              xAxisHint && xMissing ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
            }`}
          />
          {xAxisHint && (
            <span className={`block mt-1 text-xs ${xMissing ? 'text-amber-700' : 'text-gray-500'}`}>
              {xMissing ? `Couldn't derive a label. ${xAxisHint}` : xAxisHint}
            </span>
          )}
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Y-axis label</span>
          <input
            type="text"
            value={yAxisLabel}
            onChange={(e) => setYAxisLabel(e.target.value)}
            placeholder="e.g. Falls per 1000 OBD"
            className={`mt-1 w-full border rounded px-2 py-1.5 ${
              yAxisHint && yMissing ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
            }`}
          />
          {yAxisHint && (
            <span className={`block mt-1 text-xs ${yMissing ? 'text-amber-700' : 'text-gray-500'}`}>
              {yMissing ? `Couldn't derive a label. ${yAxisHint}` : yAxisHint}
            </span>
          )}
        </label>
      </div>
    </div>
  );
}

function IncrementGrid({
  current,
  onChange,
  rowCounts,
}: {
  current: Increment;
  onChange: (v: Increment) => void;
  /** Optional per-cadence row count, shown next to each label. */
  rowCounts?: Partial<Record<Increment, number>>;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <IncrementOption value="daily" current={current} onChange={onChange} label="Daily" hint="One row per day" rowCount={rowCounts?.daily} />
      <IncrementOption value="weekly" current={current} onChange={onChange} label="Weekly" hint="One row per 7 days" rowCount={rowCounts?.weekly} />
      <IncrementOption value="monthly" current={current} onChange={onChange} label="Monthly" hint="One row per month, snapped to the 1st" rowCount={rowCounts?.monthly} />
      <IncrementOption value="yearly" current={current} onChange={onChange} label="Yearly" hint="One row per year, snapped to 1 Jan" rowCount={rowCounts?.yearly} />
    </div>
  );
}

function IncrementOption({
  value,
  current,
  onChange,
  label,
  hint,
  rowCount,
}: {
  value: Increment;
  current: Increment;
  onChange: (v: Increment) => void;
  label: string;
  hint: string;
  rowCount?: number;
}) {
  const active = current === value;
  return (
    <label
      className={`min-w-[120px] border rounded p-3 cursor-pointer transition-colors ${
        active
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <input
        type="radio"
        name="increment"
        value={value}
        checked={active}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {typeof rowCount === 'number' && (
          <span
            className={`text-xs tabular-nums px-1.5 py-0.5 rounded ${
              active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {rowCount} row{rowCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  headers,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  headers: string[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-gray-700">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className={`mt-1 border rounded px-2 py-1 ${
          required && !value ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <option value="">{required ? 'Select a column' : '— none —'}</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function BucketPreview({
  rawRows,
  increment,
  aggregator,
}: {
  rawRows: MeasureRow[];
  increment: Increment;
  aggregator: Aggregator;
}) {
  // Group rows by bucket, then keep only the first few buckets that
  // actually have multiple input rows — the user already knows that
  // 1-row buckets are passed through unchanged.
  const previews = useMemo(() => {
    const groups = new Map<string, { values: number[]; raw: MeasureRow[] }>();
    const order: string[] = [];
    for (const row of rawRows) {
      if (!row.date) continue;
      const bucket = bucketFor(row.date, increment);
      if (!groups.has(bucket)) {
        groups.set(bucket, { values: [], raw: [] });
        order.push(bucket);
      }
      const v = Number(row.value);
      if (Number.isFinite(v)) groups.get(bucket)!.values.push(v);
      groups.get(bucket)!.raw.push(row);
    }
    const multi = order
      .map((b) => {
        const g = groups.get(b)!;
        // Pick the winner index for max / min / first / last so the
        // user can see exactly which value the aggregator kept.
        let winnerIndex: number | null = null;
        let result = NaN;
        if (g.values.length > 0) {
          switch (aggregator) {
            case 'sum':
              result = g.values.reduce((a, c) => a + c, 0);
              winnerIndex = null;
              break;
            case 'mean':
              result = g.values.reduce((a, c) => a + c, 0) / g.values.length;
              winnerIndex = null;
              break;
            case 'max':
              result = Math.max(...g.values);
              winnerIndex = g.values.indexOf(result);
              break;
            case 'min':
              result = Math.min(...g.values);
              winnerIndex = g.values.indexOf(result);
              break;
            case 'first':
              result = g.values[0];
              winnerIndex = 0;
              break;
            case 'last':
              result = g.values[g.values.length - 1];
              winnerIndex = g.values.length - 1;
              break;
          }
        }
        return { bucket: b, values: g.values, raw: g.raw, result, winnerIndex };
      })
      .filter((p) => p.values.length > 1);
    return multi.slice(0, 5);
  }, [rawRows, increment, aggregator]);

  if (previews.length === 0) return null;

  const fmt = (n: number) => Number(n.toFixed(3)).toString();
  const aggLabel = AGGREGATOR_LABELS[aggregator].toLowerCase();

  return (
    <section className="mt-5">
      <h4 className="text-sm font-medium text-gray-700">
        How will the rows be combined?
      </h4>
      <p className="mt-1 text-xs text-gray-500">
        First few buckets where multiple rows share the same {' '}
        {increment === 'yearly' ? 'year' : increment === 'monthly' ? 'month' : increment === 'weekly' ? 'week' : 'day'},
        and the value the {aggLabel} aggregator picks.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-3 py-1.5 text-xs font-medium text-gray-600">Bucket</th>
              <th className="px-3 py-1.5 text-xs font-medium text-gray-600">Input values</th>
              <th className="px-3 py-1.5 text-xs font-medium text-gray-600 text-right">
                Result ({aggLabel})
              </th>
            </tr>
          </thead>
          <tbody>
            {previews.map((p) => (
              <tr key={p.bucket} className="border-t border-gray-100">
                <td className="px-3 py-1.5 text-xs text-gray-700 tabular-nums">
                  {p.bucket}
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-700">
                  {p.values.map((v, i) => (
                    <span
                      key={i}
                      className={`inline-block mr-1.5 px-1.5 py-0.5 rounded tabular-nums ${
                        p.winnerIndex === i
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {fmt(v)}
                    </span>
                  ))}
                </td>
                <td className="px-3 py-1.5 text-xs font-semibold text-gray-900 text-right tabular-nums">
                  {fmt(p.result)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChoiceCard({
  checked,
  onChoose,
  title,
  hint,
}: {
  checked: boolean;
  onChoose: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex items-start gap-2 rounded border px-3 py-2 cursor-pointer ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <input
        type="radio"
        name="aggregation-choice"
        checked={checked}
        onChange={onChoose}
        className="mt-1"
      />
      <span className="flex flex-col text-sm">
        <span className="font-medium text-gray-900">{title}</span>
        <span className="text-xs text-gray-600">{hint}</span>
      </span>
    </label>
  );
}

function NavRow({
  onBack,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  primaryDisabledHint,
}: {
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryDisabledHint?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md px-3 py-1.5 transition-colors"
      >
        <span aria-hidden>←</span>
        Back
      </button>
      <div className="flex items-center gap-3">
        {primaryDisabledHint && (
          <span className="text-xs text-amber-700">{primaryDisabledHint}</span>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
