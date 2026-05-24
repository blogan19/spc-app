'use client'
// Measured-recalculation flow from MDC: Strengthening Your Decisions, p.18.
// Replaces the bare "recalculate" checkbox. A recalculation requires all
// three guards to pass plus a non-empty justification — Reluctant never
// recalculates, Shifty recalculates on noise, Measured asks these
// questions and writes down the answer.

import { useEffect, useMemo, useState } from 'react';
import { analyseSpc } from '@/lib/spc';

const SUSTAINED_THRESHOLD = 7; // minimum points after the change to commit

function buildPreview(rows, chartKind, rowIndex) {
  if (!rows || rows.length === 0 || rowIndex == null) return null;
  const kind = ['RunChart', 'P', 'C', 'U'].includes(chartKind) ? chartKind : 'XmR';
  const coerce = (slice) => slice
    .filter((d) => d?.date && d?.value !== '' && d?.value != null)
    .map((d) => ({
      date: d.date,
      value: Number(d.value),
      denominator:
        d?.denominator !== undefined && d?.denominator !== ''
          ? Number(d.denominator)
          : undefined,
      // Strip recalc flags so the preview reflects "what if THIS were the
      // only boundary?" rather than mixing with any existing ones.
      recalculate: false,
    }))
    .filter((r) => Number.isFinite(r.value));

  const before = coerce(rows.slice(0, rowIndex));
  const after = coerce(rows.slice(rowIndex));
  const all = coerce(rows);

  const safeAnalyse = (input) => {
    if (input.length < 2) return null;
    try {
      const { analysis } = analyseSpc(input, { kind });
      const seg = analysis.segments[0];
      if (!seg) return null;
      return { mean: seg.mean, ucl: seg.ucl, lcl: seg.lcl, sigma: seg.sigma };
    } catch {
      return null;
    }
  };

  return {
    current: safeAnalyse(all),
    before: safeAnalyse(before),
    after: safeAnalyse(after),
  };
}

const fmt = (n) =>
  Number.isFinite(n) ? Number(n.toFixed(3)).toString() : '—';

export default function RecalculateDialog({
  open,
  onClose,
  onConfirm,
  onUndo,
  rowIndex,
  totalRows,
  ruleNearby,             // boolean: did any rule fire at or near this row?
  existingJustification,  // present when the row is already a phase boundary
  rows,                    // full measure.data — used to compute before/after preview
  chartKind,               // measure.chartKind — drives analysis kind
}) {
  const isAlreadyRecalc = Boolean(existingJustification);
  const subsequentPoints = Math.max(0, totalRows - rowIndex - 1);
  const sustainedAuto = subsequentPoints >= SUSTAINED_THRESHOLD;

  const [significant, setSignificant] = useState(null);
  const [reason, setReason] = useState('');
  const [sustained, setSustained] = useState(null);

  const preview = useMemo(
    () => (open ? buildPreview(rows, chartKind, rowIndex) : null),
    [open, rows, chartKind, rowIndex],
  );

  // Pre-fill from any existing answer when re-opening on a flagged row.
  useEffect(() => {
    if (!open) return;
    if (existingJustification) {
      setSignificant(true);
      setReason(existingJustification.reason ?? '');
      setSustained(true);
    } else {
      setSignificant(ruleNearby ? true : null);
      setReason('');
      setSustained(sustainedAuto ? null : false);
    }
  }, [open, existingJustification, ruleNearby, sustainedAuto]);

  if (!open) return null;

  const canConfirm =
    significant === true && reason.trim().length > 0 && sustained === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-lg font-semibold mb-1">
          {isAlreadyRecalc ? 'Phase boundary at this point' : 'Recalculate process limits here?'}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Row {rowIndex + 1} of {totalRows}. MDC recommends recalculating only when all three are true.
        </p>

        {preview && (preview.current || preview.before || preview.after) && (
          <section className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-xs">
            <p className="font-medium text-blue-900 mb-2">
              Before / after preview
            </p>
            <div className="grid grid-cols-3 gap-2 text-blue-900">
              <PreviewBlock title="Single phase (now)" seg={preview.current} />
              <PreviewBlock title="Phase ending here" seg={preview.before} />
              <PreviewBlock title="New phase starts here" seg={preview.after} />
            </div>
            <p className="mt-2 text-blue-900/80">
              The shift only matters if the new phase&rsquo;s mean is far enough
              from the old one — and the new limits are tighter or otherwise
              meaningfully different.
            </p>
          </section>
        )}

        <section className="mb-4">
          <p className="font-medium text-sm">
            1. Does the chart show a statistically significant change at or near this point?
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {ruleNearby
              ? '✓ The app detected an SPC rule firing at or near this row.'
              : '⚠ No SPC rule fired at or near this row. Reconsider before continuing.'}
          </p>
          <YesNo value={significant} onChange={setSignificant} name="q1" />
        </section>

        <section className="mb-4">
          <p className="font-medium text-sm">
            2. Can you identify a real process change that caused this?
          </p>
          <p className="text-xs text-gray-500 mb-2">
            A team meeting, a new pathway, a software change. Be specific — this note will be visible to anyone reading the chart later.
          </p>
          <textarea
            className="w-full border border-gray-300 rounded p-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. New triage pathway introduced for adult acute admissions"
          />
        </section>

        <section className="mb-4">
          <p className="font-medium text-sm">
            3. Has the change been sustained for at least {SUSTAINED_THRESHOLD} data points?
          </p>
          <p className="text-xs text-gray-500 mb-2">
            There {subsequentPoints === 1 ? 'is' : 'are'} {subsequentPoints} data {subsequentPoints === 1 ? 'point' : 'points'} after this row.
            {!sustainedAuto && ' Recalculating now risks tampering with noise.'}
          </p>
          <YesNo value={sustained} onChange={setSustained} name="q3" />
        </section>

        <div className="flex justify-between items-center mt-6">
          <div>
            {isAlreadyRecalc && (
              <button
                onClick={() => {
                  onUndo();
                  onClose();
                }}
                className="text-sm text-red-600 underline"
              >
                Remove phase boundary
              </button>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm rounded border border-gray-300"
            >
              Cancel
            </button>
            <button
              disabled={!canConfirm}
              onClick={() => {
                onConfirm({ reason: reason.trim(), confirmedAt: new Date().toISOString() });
                onClose();
              }}
              className={`px-3 py-1 text-sm rounded text-white ${
                canConfirm ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isAlreadyRecalc ? 'Update justification' : 'Apply recalculation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ title, seg }) {
  return (
    <div className="rounded bg-white/70 border border-blue-100 p-2">
      <div className="font-medium text-[11px] uppercase tracking-wide opacity-80">
        {title}
      </div>
      {seg ? (
        <dl className="mt-1 grid grid-cols-2 gap-x-2 tabular-nums">
          <dt className="text-[11px] opacity-70">Mean</dt>
          <dd>{fmt(seg.mean)}</dd>
          <dt className="text-[11px] opacity-70">UCL</dt>
          <dd>{fmt(seg.ucl)}</dd>
          <dt className="text-[11px] opacity-70">LCL</dt>
          <dd>{fmt(seg.lcl)}</dd>
        </dl>
      ) : (
        <p className="mt-1 opacity-60">Not enough points</p>
      )}
    </div>
  );
}

function YesNo({ value, onChange, name }) {
  return (
    <div className="flex space-x-4 text-sm">
      <label className="flex items-center space-x-1">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
        />
        <span>Yes</span>
      </label>
      <label className="flex items-center space-x-1">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
        />
        <span>No</span>
      </label>
    </div>
  );
}
