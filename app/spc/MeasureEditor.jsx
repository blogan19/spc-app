'use client'
// Per-measure editor: data table + appearance settings as two tabs.
// Replaces SpcForm.jsx. Operates on a measure prop, reports changes via
// callbacks — no local state for the row data itself.

import { useEffect, useMemo, useRef, useState } from 'react';
import { analyseSpc } from '@/lib/spc';
import { formatDateForAxis, nextDateAt } from '@/lib/project/dateRange';
import RecalculateDialog from './RecalculateDialog';
import AppearanceForm from './AppearanceForm';
import CsvImportDialog from './CsvImportDialog';

export default function MeasureEditor({
  measure,
  onUpdateRows,
  onUpdateRowField,
  onAddRow,
  onSetRecalculation,
  onUpdateSettings,
  onUpdateTarget,
}) {
  const [tab, setTab] = useState('data'); // 'data' | 'appearance'
  const [recalcDialogRow, setRecalcDialogRow] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [pendingDropFile, setPendingDropFile] = useState(null);
  const [dragHover, setDragHover] = useState(false);

  const { data, settings } = measure;

  // Mirror the chart's analysis so the recalc dialog can answer Q1 itself.
  // Chart kind matters because P charts use different limit maths.
  const analysis = useMemo(() => {
    const kind = ['RunChart', 'P', 'C', 'U'].includes(measure.chartKind)
      ? measure.chartKind
      : 'XmR';
    const rows = data
      .filter((d) => d?.date && d?.value !== '' && d?.value != null)
      .map((d) => ({
        date: d.date,
        value: Number(d.value),
        denominator:
          d?.denominator !== undefined && d?.denominator !== ''
            ? Number(d.denominator)
            : undefined,
        recalculate: Boolean(d?.comment?.recalculate),
      }))
      .filter((r) => Number.isFinite(r.value));
    return analyseSpc(rows, { kind }).analysis;
  }, [data, measure.chartKind]);

  const ruleNearby = (rowIndex) => {
    const r = analysis.rules;
    const hits = [
      ...r.outsideLimits,
      ...r.runAboveBelowMean,
      ...r.increasingRun,
      ...r.decreasingRun,
      ...r.twoOfThreeOuterThird,
    ];
    return hits.some((idx) => Math.abs(idx - rowIndex) <= 2);
  };

  // Next date follows the measure's increment so a monthly chart grows
  // by one month per click, not one day. Falls back to +1 day when the
  // measure pre-dates the increment field.
  const getNextDate = () => {
    if (data.length === 0) return '';
    const latest = data[data.length - 1].date;
    if (!latest) return '';
    return nextDateAt(latest, measure.increment ?? 'daily');
  };

  const addRowLabel =
    measure.increment === 'yearly'
      ? '+ 1 year'
      : measure.increment === 'monthly'
        ? '+ 1 month'
        : measure.increment === 'weekly'
          ? '+ 1 week'
          : '+ 1 day';

  // After a row-shape change (append or remove), move focus to a
  // specific cell so keyboard entry feels continuous. `row: 'last'`
  // resolves at effect-time (we don't know the new index when
  // scheduling an append).
  //
  // For Pareto / Funnel the "value" the user starts typing into is the
  // category / unit name (column A) rather than column B.
  const pendingFocus = useRef(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending || data.length === 0) return;
    const idx =
      pending.row === 'last'
        ? data.length - 1
        : Math.max(0, Math.min(pending.row, data.length - 1));
    const el = document.getElementById(`${pending.col}${idx}`);
    if (!el) return;
    el.focus();
    // Cells are contentEditable — drop the caret at the end so typing
    // doesn't overwrite the cell.
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch {
      // No-op — focus succeeded; selection is best-effort.
    }
  }, [data.length]);

  const isCategoricalKind =
    measure.chartKind === 'Pareto' || measure.chartKind === 'Funnel';
  const focusCol = isCategoricalKind ? 'A' : 'B';

  const handleAddRow = () => {
    pendingFocus.current = { col: focusCol, row: 'last' };
    onAddRow(getNextDate());
  };

  const handleRemoveRow = (rowId, returnCol) => {
    if (rowId < 0 || rowId >= data.length) return;
    pendingFocus.current = { col: returnCol, row: Math.max(0, rowId - 1) };
    onUpdateRows([...data.slice(0, rowId), ...data.slice(rowId + 1)]);
  };

  // Visual / nav column order: A (date), B (value), F (denominator if
  // present), D (title), E (text). The Recalculate checkbox sits at the
  // end of the row but is not part of keyboard text navigation.
  const navCols = (() => {
    const out = ['A', 'B'];
    if (measure.chartKind === 'P' || measure.chartKind === 'U' || measure.chartKind === 'Funnel') {
      out.push('F');
    }
    out.push('D', 'E');
    return out;
  })();

  const handleKeyNav = (e, pos) => {
    const cols = navCols;
    const lastCol = cols[cols.length - 1];
    const firstCol = cols[0];
    const key = e.key;
    const columnId = pos.charAt(0);
    const rowId = Number(pos.substr(1));
    const cursorLoc = window.getSelection()?.anchorOffset ?? 0;

    if (key === 'Enter') {
      // Move down to the same column in the next row. On the last row,
      // extend the table (Excel-style table behaviour).
      e.preventDefault();
      if (rowId + 1 === data.length) {
        pendingFocus.current = { col: columnId, row: 'last' };
        onAddRow(getNextDate());
      } else {
        document.getElementById(`${columnId}${rowId + 1}`)?.focus();
      }
      return;
    }
    if (key === 'Backspace') {
      // Row-delete only when the current cell is empty so the user
      // can still backspace characters mid-edit. Lets them collapse a
      // row by clearing the value cell first, then hitting Backspace
      // a second time — the same pattern as list editors in Notion etc.
      const cellEmpty = (e.target.textContent ?? '').trim() === '';
      if (cellEmpty) {
        e.preventDefault();
        handleRemoveRow(rowId, columnId);
        return;
      }
    }
    if (key === 'ArrowDown') {
      if (rowId + 1 === data.length) {
        handleAddRow();
        return;
      }
      document.getElementById(`${columnId}${rowId + 1}`)?.focus();
    }
    if (key === 'ArrowUp' && rowId !== 0) {
      document.getElementById(`${columnId}${rowId - 1}`)?.focus();
    }
    if (key === 'ArrowRight' && columnId !== lastCol) {
      const idx = cols.indexOf(columnId);
      if (idx >= 0) document.getElementById(`${cols[idx + 1]}${rowId}`)?.focus();
    }
    if (key === 'ArrowLeft' && cursorLoc === 0 && columnId !== firstCol) {
      const idx = cols.indexOf(columnId);
      if (idx > 0) document.getElementById(`${cols[idx - 1]}${rowId}`)?.focus();
    }
  };

  // Excel-style multi-cell paste. Triggered on any cell — we use the
  // focused cell's id to anchor the paste. Single-cell paste (no
  // tabs/newlines) goes through contentEditable's default so the user
  // can still paste a single value normally.
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    const hasGrid = /\t/.test(text) || /\r?\n.+/.test(text);
    if (!hasGrid) return; // let the default contentEditable paste run

    const active = document.activeElement;
    if (!active || !active.id) return;
    const startCol = active.id.charAt(0);
    const startRow = Number(active.id.slice(1));
    if (!Number.isFinite(startRow)) return;
    const startIdx = navCols.indexOf(startCol);
    if (startIdx === -1) return;

    e.preventDefault();
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    // Strip a trailing empty line that Excel commonly appends.
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    if (lines.length === 0) return;

    const next = data.map((r) => ({ ...r, comment: { ...r.comment } }));
    lines.forEach((line, rowOffset) => {
      const targetRow = startRow + rowOffset;
      // Extend the data array with empty rows whose dates follow the
      // measure's increment — this is the same behaviour as clicking
      // "+ 1 month" repeatedly.
      while (next.length <= targetRow) {
        const lastDate = next[next.length - 1]?.date;
        const nextDate = lastDate
          ? nextDateAt(lastDate, measure.increment ?? 'daily')
          : '';
        next.push({ date: nextDate, value: '', comment: {} });
      }
      const cells = line.split('\t');
      cells.forEach((rawCell, colOffset) => {
        const targetCol = navCols[startIdx + colOffset];
        if (!targetCol) return;
        const cell = rawCell.trim();
        const row = { ...next[targetRow], comment: { ...next[targetRow].comment } };
        switch (targetCol) {
          case 'A':
            // Monthly dates are anchored to the 1st — skip user-supplied
            // dates rather than introducing a partial-month entry.
            if (measure.increment !== 'monthly') row.date = cell;
            break;
          case 'B':
            row.value = cell;
            break;
          case 'F':
            row.denominator = cell;
            break;
          case 'D':
            row.comment.title = cell;
            break;
          case 'E':
            row.comment.label = cell;
            break;
          default:
            break;
        }
        next[targetRow] = row;
      });
    });
    onUpdateRows(next);
  };

  const dropHandler = (ev) => {
    ev.preventDefault();
    setDragHover(false);
    const file = ev.dataTransfer.files?.[0];
    if (!file) return;
    // Accept .csv and .xlsx — anything else is rejected with a clearer
    // signal inside the dialog itself (handleFile re-validates).
    if (!/\.(csv|xlsx)$/i.test(file.name)) return;
    setPendingDropFile(file);
    setCsvOpen(true);
  };
  const dragOverHandler = (e) => {
    e.preventDefault();
    setDragHover(true);
  };
  const dragLeaveHandler = () => setDragHover(false);

  const handleCsvImport = (rows, mode) => {
    if (mode === 'replace') {
      onUpdateRows(rows);
    } else {
      onUpdateRows([...data, ...rows]);
    }
  };

  const isPareto = measure.chartKind === 'Pareto';
  const isFunnel = measure.chartKind === 'Funnel';
  const isCategorical = isPareto || isFunnel;
  const needsDenominator =
    measure.chartKind === 'P' || measure.chartKind === 'U' || isFunnel;
  const showRecalc = !isCategorical;
  const dateHeader = isPareto ? 'Category' : isFunnel ? 'Unit' : 'Date (x)';
  const valueHeader =
    measure.chartKind === 'P' || measure.chartKind === 'U' || isFunnel
      ? 'Numerator'
      : measure.chartKind === 'C'
        ? 'Count'
        : isPareto
          ? 'Count'
          : 'Value (y)';
  // Monthly dates are always the 1st of the month; the user picks a
  // calendar month at setup time and never benefits from editing the
  // raw ISO. Show them the same "May-2026" label the chart axis uses
  // and keep the cell read-only so it's clear the date is anchored to
  // the month, not the day.
  const isMonthly = measure.increment === 'monthly';
  const dataRows = data.map((row, c) => {
    const { date, value, comment, denominator } = row;
    const dateDisplay = isMonthly && date ? formatDateForAxis(date, 'monthly') : date;
    return (
      <tr key={`row${c}`}>
        <td
          className={
            isMonthly
              ? 'p-1 border-solid border border-black bg-gray-50 text-gray-700'
              : 'p-1 border-solid border border-black'
          }
          id={`A${c}`}
          contentEditable={!isMonthly}
          suppressContentEditableWarning
          onBlur={
            isMonthly
              ? undefined
              : (e) => onUpdateRowField(c, 'date', e.target.textContent)
          }
          onKeyDown={(e) => handleKeyNav(e, `A${c}`)}
          tabIndex={isMonthly ? -1 : undefined}
          title={isMonthly ? `Stored as ${date}` : undefined}
        >
          {dateDisplay}
        </td>
        <td
          className="p-1 border-solid border border-black"
          id={`B${c}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateRowField(c, 'value', e.target.textContent)}
          onKeyDown={(e) => handleKeyNav(e, `B${c}`)}
        >
          {value}
        </td>
        {needsDenominator && (
          <td
            className="p-1 border-solid border border-black"
            id={`F${c}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdateRowField(c, 'denominator', e.target.textContent)}
            onKeyDown={(e) => handleKeyNav(e, `F${c}`)}
          >
            {denominator ?? ''}
          </td>
        )}
        <td
          className="p-1 border-solid border border-black"
          id={`D${c}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateRowField(c, 'commentTitle', e.target.textContent)}
          onKeyDown={(e) => handleKeyNav(e, `D${c}`)}
        >
          {comment?.title ?? ''}
        </td>
        <td
          className="p-1 border-solid border border-black"
          id={`E${c}`}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdateRowField(c, 'commentText', e.target.textContent)}
          onKeyDown={(e) => handleKeyNav(e, `E${c}`)}
        >
          {comment?.label ?? ''}
        </td>
        {showRecalc && (
          <td className="p-1 border-solid border border-black text-center">
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer accent-blue-600"
              checked={Boolean(comment?.recalculate)}
              onClick={(e) => {
                // Don't let the click toggle the checkbox state; the
                // dialog is the source of truth (it captures the
                // justification along with the boundary flag).
                e.preventDefault();
                setRecalcDialogRow(c);
              }}
              onChange={() => { /* controlled via dialog */ }}
              title={
                comment?.recalcJustification?.reason ||
                (comment?.recalculate
                  ? 'Phase boundary — click to review'
                  : 'Click to mark as phase boundary')
              }
              aria-label="Recalculate control lines"
            />
          </td>
        )}
      </tr>
    );
  });

  return (
    <div>
      <div role="tablist" className="flex border-b border-gray-300 mb-4">
        <TabButton active={tab === 'data'} onClick={() => setTab('data')}>
          Chart data
        </TabButton>
        <TabButton active={tab === 'appearance'} onClick={() => setTab('appearance')}>
          Chart appearance
        </TabButton>
      </div>

      {tab === 'data' ? (
        <div
          onDrop={dropHandler}
          onDragOver={dragOverHandler}
          onDragLeave={dragLeaveHandler}
          className={dragHover ? 'rounded outline outline-2 outline-blue-400 outline-offset-2' : ''}
        >
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2">
            <span className="font-medium text-blue-900 text-sm">
              Paste from Excel
            </span>
            <span className="text-xs text-blue-900/80 flex-1">
              Copy a block of cells in Excel (or Google Sheets) and paste it
              straight into the table — rows and columns fill in for you. Or
              drop a spreadsheet onto this panel.
            </span>
            <button
              type="button"
              onClick={() => {
                setPendingDropFile(null);
                setCsvOpen(true);
              }}
              className="text-sm px-3 py-1 rounded bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 whitespace-nowrap"
            >
              Upload spreadsheet…
            </button>
          </div>

          {/* Tablet+ table view */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full mb-1 border-collapse text-sm" onPaste={handlePaste}>
            <thead>
              <tr>
                <th className="bg-slate-300 border-solid border border-black">{dateHeader}</th>
                <th className="bg-slate-300 border-solid border border-black">{valueHeader}</th>
                {needsDenominator && (
                  <th className="bg-slate-300 border-solid border border-black">Denominator</th>
                )}
                <th className="bg-slate-300 border-solid border border-black">Comment Title</th>
                <th className="bg-slate-300 border-solid border border-black">Comment Content</th>
                {showRecalc && (
                  <th className="bg-slate-300 border-solid border border-black">
                    Recalculate
                    <br />
                    Control Lines
                  </th>
                )}
              </tr>
            </thead>
            <tbody>{dataRows}</tbody>
          </table>
          </div>

          {/* Mobile card view — bigger tap targets, one row per card,
              comment fields collapse so the value entry stays the focus. */}
          <ul className="sm:hidden space-y-2">
            {data.map((row, c) => {
              const { date, value, comment, denominator } = row;
              const dateDisplay =
                isMonthly && date ? formatDateForAxis(date, 'monthly') : date;
              return (
                <li
                  key={`mobile-row-${c}`}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {dateHeader}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {dateDisplay || '—'}
                    </span>
                  </div>
                  <label className="block mt-2">
                    <span className="text-xs text-gray-500">{valueHeader}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={value}
                      onBlur={(e) => onUpdateRowField(c, 'value', e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-base"
                    />
                  </label>
                  {needsDenominator && (
                    <label className="block mt-2">
                      <span className="text-xs text-gray-500">Denominator</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={denominator ?? ''}
                        onBlur={(e) => onUpdateRowField(c, 'denominator', e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-base"
                      />
                    </label>
                  )}
                  <details className="mt-2">
                    <summary className="text-xs text-blue-700 cursor-pointer">
                      Comment / phase boundary
                    </summary>
                    <label className="block mt-2">
                      <span className="text-xs text-gray-500">Title</span>
                      <input
                        type="text"
                        defaultValue={comment?.title ?? ''}
                        onBlur={(e) => onUpdateRowField(c, 'commentTitle', e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="block mt-2">
                      <span className="text-xs text-gray-500">Content</span>
                      <textarea
                        defaultValue={comment?.label ?? ''}
                        onBlur={(e) => onUpdateRowField(c, 'commentText', e.target.value)}
                        rows={2}
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-y"
                      />
                    </label>
                    {showRecalc && (
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-blue-600"
                          checked={Boolean(comment?.recalculate)}
                          onClick={(e) => {
                            e.preventDefault();
                            setRecalcDialogRow(c);
                          }}
                          onChange={() => { /* controlled via dialog */ }}
                        />
                        <span className="text-xs text-gray-700">
                          Recalculate control lines from this point
                        </span>
                      </label>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>

          <button onClick={handleAddRow} className="mt-2 w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1 rounded border border-gray-300 hover:bg-gray-50 text-sm">
            {isPareto ? '+ Add category' : isFunnel ? '+ Add unit' : addRowLabel}
          </button>
        </div>
      ) : (
        <AppearanceForm
          settings={settings}
          onUpdate={onUpdateSettings}
          target={measure.target}
          onUpdateTarget={onUpdateTarget}
        />
      )}

      <RecalculateDialog
        open={recalcDialogRow !== null}
        onClose={() => setRecalcDialogRow(null)}
        rowIndex={recalcDialogRow ?? 0}
        totalRows={data.length}
        ruleNearby={recalcDialogRow !== null && ruleNearby(recalcDialogRow)}
        existingJustification={
          recalcDialogRow !== null ? data[recalcDialogRow]?.comment?.recalcJustification : null
        }
        rows={data}
        chartKind={measure.chartKind}
        onConfirm={(justification) => onSetRecalculation(recalcDialogRow, justification)}
        onUndo={() => onSetRecalculation(recalcDialogRow, null)}
      />

      <CsvImportDialog
        open={csvOpen}
        onClose={() => {
          setCsvOpen(false);
          setPendingDropFile(null);
        }}
        onImport={handleCsvImport}
        initialFile={pendingDropFile}
      />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-700 -mb-px'
          : 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900'
      }
    >
      {children}
    </button>
  );
}
