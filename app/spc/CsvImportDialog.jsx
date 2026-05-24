'use client'
// Spreadsheet import: file → preview → column mapping → confirm. Lives
// entirely in the dialog. On confirm, returns a MeasureRow[] plus the
// chosen mode (replace / append) via onImport.
//
// Accepted formats: .csv (parsed directly) and .xlsx (parsed via SheetJS,
// first sheet converted to CSV text and run through the same pipeline).

import { useEffect, useMemo, useState } from 'react';
import {
  cleanRows,
  guessMapping,
  parseCsv,
  validateImport,
} from '@/lib/project/csv';

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx'];
const ACCEPT_ATTR =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function isAcceptedFile(file) {
  return ACCEPTED_EXTENSIONS.includes(fileExtension(file.name));
}

async function readSpreadsheetAsCsv(file) {
  const ext = fileExtension(file.name);
  if (ext === 'csv') return file.text();
  // Lazy import keeps the ~600KB SheetJS bundle out of the initial chunk.
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('The workbook has no sheets.');
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}

const PREVIEW_ROWS = 10;

export default function CsvImportDialog({ open, onClose, onImport, initialFile = null }) {
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('replace');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dropInvalidRows, setDropInvalidRows] = useState(true);
  const [sortByDate, setSortByDate] = useState(true);
  const [showIssueDetail, setShowIssueDetail] = useState(false);

  // Reset whenever the dialog opens, and accept an initialFile so the
  // workspace drop-zone can push a file straight in.
  useEffect(() => {
    if (!open) return;
    setParsed(null);
    setMapping({});
    setMode('replace');
    setFileName('');
    setError('');
    setDropInvalidRows(true);
    setSortByDate(true);
    setShowIssueDetail(false);
    if (initialFile) void handleFile(initialFile);
  }, [open, initialFile]);

  const handleFile = async (file) => {
    setFileName(file.name);
    setError('');
    if (!isAcceptedFile(file)) {
      setParsed(null);
      setError(
        `Unsupported file type. Please upload a .csv or .xlsx spreadsheet (got "${file.name}").`,
      );
      return;
    }
    try {
      const text = await readSpreadsheetAsCsv(file);
      const p = parseCsv(text);
      if (p.headers.length === 0 || p.rows.length === 0) {
        setError('The file does not appear to contain any data rows with a header.');
        setParsed(null);
        return;
      }
      setParsed(p);
      setMapping(guessMapping(p.headers));
    } catch (err) {
      setError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const previewRows = useMemo(
    () => (parsed ? parsed.rows.slice(0, PREVIEW_ROWS) : []),
    [parsed],
  );

  const validation = useMemo(() => {
    if (!parsed || !mapping.date || !mapping.value) return null;
    return validateImport(parsed, mapping);
  }, [parsed, mapping]);

  const mappingComplete = Boolean(mapping.date && mapping.value);
  const importBlocked =
    !mappingComplete ||
    (validation !== null && validation.errorCount > 0 && !dropInvalidRows);
  const canImport = !importBlocked;

  // How many rows will actually go through after applying clean options.
  const willImportCount = useMemo(() => {
    if (!parsed || !validation) return parsed?.rows.length ?? 0;
    if (dropInvalidRows) return parsed.rows.length - validation.errorRowIndices.length;
    return parsed.rows.length;
  }, [parsed, validation, dropInvalidRows]);

  const handleImport = () => {
    if (!parsed || !canImport) return;
    const rows = validation
      ? cleanRows(parsed, mapping, validation, { dropInvalidRows, sortByDate })
      : [];
    onImport(rows, mode);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Import spreadsheet</h2>
          <p className="text-sm text-gray-600 mt-1">
            Bring time-series data in from a <strong>.csv</strong> or <strong>.xlsx</strong>{' '}
            file. The first row must contain column headers; dates can be ISO
            (YYYY-MM-DD) or UK (DD/MM/YYYY).
          </p>
        </header>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!parsed ? (
            <FilePicker fileName={fileName} onFile={handleFile} error={error} />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  <span className="font-medium text-gray-800">{fileName}</span> · {parsed.rows.length}{' '}
                  rows
                </span>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="text-blue-600 underline"
                >
                  Choose a different file
                </button>
              </div>

              {parsed.warnings.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  {parsed.warnings.slice(0, 3).map((w, i) => (
                    <div key={i}>⚠ {w}</div>
                  ))}
                </div>
              )}

              <ColumnMapper headers={parsed.headers} mapping={mapping} onChange={setMapping} />

              {validation && (validation.errorCount > 0 || validation.warningCount > 0) && (
                <IssueSummary
                  validation={validation}
                  expanded={showIssueDetail}
                  onToggle={() => setShowIssueDetail((v) => !v)}
                />
              )}

              <PreviewTable
                headers={parsed.headers}
                rows={previewRows}
                mapping={mapping}
                rowLevel={validation?.rowLevel ?? {}}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <fieldset>
                  <legend className="font-medium text-gray-700 mb-1">Clean up</legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dropInvalidRows}
                      onChange={(e) => setDropInvalidRows(e.target.checked)}
                    />
                    Drop rows flagged as errors
                    {validation && validation.errorCount > 0 && (
                      <span className="text-xs text-gray-500">
                        ({validation.errorRowIndices.length} affected)
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={sortByDate}
                      onChange={(e) => setSortByDate(e.target.checked)}
                    />
                    Sort by date
                  </label>
                </fieldset>

                <fieldset>
                  <legend className="font-medium text-gray-700 mb-1">When importing</legend>
                  <label className="inline-flex items-center mr-4">
                    <input
                      type="radio"
                      name="mode"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="mr-1"
                    />
                    Replace existing rows
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="append"
                      checked={mode === 'append'}
                      onChange={() => setMode('append')}
                      className="mr-1"
                    />
                    Append to existing rows
                  </label>
                </fieldset>
              </div>
            </>
          )}
        </div>

        <footer className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm rounded border border-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            title={
              importBlocked && validation?.errorCount
                ? 'Fix the errors or tick "Drop rows flagged as errors" to proceed'
                : undefined
            }
            className={`px-3 py-1 text-sm rounded text-white ${
              canImport ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Import {willImportCount} {willImportCount === 1 ? 'row' : 'rows'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function FilePicker({ fileName, onFile, error }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`border-2 border-dashed rounded-lg p-8 text-center text-sm ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <p className="text-gray-700 mb-2">Drop a .csv or .xlsx file here, or</p>
      <label className="inline-block px-3 py-1 rounded bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
        Choose file…
        <input
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </label>
      {fileName && <p className="text-gray-500 mt-2">{fileName}</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function ColumnMapper({ headers, mapping, onChange }) {
  const set = (field) => (e) => onChange({ ...mapping, [field]: e.target.value || undefined });
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Select
        label="Date column (required)"
        required
        value={mapping.date ?? ''}
        onChange={set('date')}
        headers={headers}
      />
      <Select
        label="Value / numerator column (required)"
        required
        value={mapping.value ?? ''}
        onChange={set('value')}
        headers={headers}
      />
      <Select
        label="Denominator column (P/C/U charts only)"
        value={mapping.denominator ?? ''}
        onChange={set('denominator')}
        headers={headers}
        includeNone
      />
      <div /> {/* keep the grid balanced */}
      <Select
        label="Comment title (optional)"
        value={mapping.commentTitle ?? ''}
        onChange={set('commentTitle')}
        headers={headers}
        includeNone
      />
      <Select
        label="Comment content (optional)"
        value={mapping.commentContent ?? ''}
        onChange={set('commentContent')}
        headers={headers}
        includeNone
      />
    </div>
  );
}

function Select({ label, value, onChange, headers, required = false, includeNone = false }) {
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
        {!required && includeNone && null}
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewTable({ headers, rows, mapping, rowLevel }) {
  const usedColumns = new Set([
    mapping.date,
    mapping.value,
    mapping.denominator,
    mapping.commentTitle,
    mapping.commentContent,
  ]);
  const roleFor = (h) => {
    if (h === mapping.date) return 'date';
    if (h === mapping.value) return 'value';
    if (h === mapping.denominator) return 'denom';
    if (h === mapping.commentTitle) return 'title';
    if (h === mapping.commentContent) return 'content';
    return null;
  };
  const rowClassFor = (i) => {
    const level = rowLevel[i];
    if (level === 'error') return 'bg-red-50';
    if (level === 'warning') return 'bg-amber-50';
    return 'even:bg-gray-50';
  };
  return (
    <div className="text-xs border border-gray-200 rounded overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="w-6 px-1 py-1 border-b border-gray-200" aria-label="Status" />
            {headers.map((h) => {
              const role = roleFor(h);
              return (
                <th
                  key={h}
                  className={`text-left px-2 py-1 border-b border-gray-200 ${
                    usedColumns.has(h) ? 'text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {h}
                  {role && (
                    <span className="block text-[10px] uppercase tracking-wide opacity-70">
                      {role}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const level = rowLevel[i];
            return (
              <tr key={i} className={rowClassFor(i)}>
                <td className="w-6 px-1 py-1 text-center border-b border-gray-100">
                  {level === 'error' && (
                    <span className="text-red-600" title="Has errors — see issue list">
                      ✕
                    </span>
                  )}
                  {level === 'warning' && (
                    <span className="text-amber-600" title="Has warnings — see issue list">
                      !
                    </span>
                  )}
                </td>
                {headers.map((h) => (
                  <td
                    key={h}
                    className={`px-2 py-1 border-b border-gray-100 ${
                      usedColumns.has(h) ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {r[h]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === PREVIEW_ROWS && (
        <p className="px-2 py-1 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-200">
          Showing the first {PREVIEW_ROWS} rows.
        </p>
      )}
    </div>
  );
}

function IssueSummary({ validation, expanded, onToggle }) {
  const { errorCount, warningCount, issues } = validation;
  return (
    <div className="text-sm border border-gray-200 rounded">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
              ✕ {errorCount} {errorCount === 1 ? 'error' : 'errors'}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
              ! {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </span>
          )}
          <span className="text-xs text-gray-600">
            {errorCount > 0
              ? 'Fix the source CSV or tick "Drop rows flagged as errors" below'
              : 'These are not blocking but worth a look'}
          </span>
        </div>
        <span className="text-xs text-gray-500">{expanded ? 'Hide' : 'Show details'}</span>
      </button>
      {expanded && (
        <ul className="max-h-40 overflow-y-auto px-3 py-2 text-xs space-y-1 border-t border-gray-200 bg-gray-50">
          {issues.map((iss, i) => (
            <li key={i} className={iss.level === 'error' ? 'text-red-700' : 'text-amber-700'}>
              <span className="font-medium">
                {iss.rowIndex !== undefined ? `Row ${iss.rowIndex + 1}` : 'Dataset'}
                {iss.field ? ` · ${iss.field}` : ''}:
              </span>{' '}
              {iss.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
