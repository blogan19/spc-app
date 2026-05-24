'use client'
// Incident CSV import: file pick → column mapping → preview → import.
// Same flow as CsvImportDialog but mapped to the incident schema rather
// than the measure schema.

import { useEffect, useMemo, useState } from 'react';
import {
  applyIncidentMapping,
  guessIncidentMapping,
  parseIncidentCsv,
} from '@/lib/project/incidents';

const PREVIEW_ROWS = 10;

export default function IncidentImportDialog({ open, onClose, onImport }) {
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setParsed(null);
    setMapping({});
    setFileName('');
    setError('');
  }, [open]);

  const handleFile = async (file) => {
    setFileName(file.name);
    setError('');
    try {
      const text = await file.text();
      const p = parseIncidentCsv(text);
      if (p.headers.length === 0 || p.rows.length === 0) {
        setError('The file does not appear to contain any data rows with a header.');
        setParsed(null);
        return;
      }
      setParsed(p);
      setMapping(guessIncidentMapping(p.headers));
    } catch (err) {
      setError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const previewRows = useMemo(
    () => (parsed ? parsed.rows.slice(0, PREVIEW_ROWS) : []),
    [parsed],
  );

  const mappingComplete = Boolean(mapping.datetime && mapping.type && mapping.location);

  const handleImport = () => {
    if (!parsed || !mappingComplete) return;
    const incidents = applyIncidentMapping(parsed, mapping);
    onImport(incidents);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Import incidents</h2>
          <p className="text-sm text-gray-600 mt-1">
            Bring incident records in from an LFPSE / LRMS export. Only date, type and location
            are required — severity and description are mapped if present. The dataset is
            stored read-only; the app analyses it but doesn't change the source.
          </p>
        </header>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!parsed ? (
            <FilePicker fileName={fileName} onFile={handleFile} error={error} />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  <span className="font-medium text-gray-800">{fileName}</span> ·{' '}
                  {parsed.rows.length} rows
                </span>
                <button
                  type="button"
                  onClick={() => setParsed(null)}
                  className="text-blue-600 underline"
                >
                  Choose a different file
                </button>
              </div>

              <ColumnMapper headers={parsed.headers} mapping={mapping} onChange={setMapping} />

              <PreviewTable
                headers={parsed.headers}
                rows={previewRows}
                mapping={mapping}
              />
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
            disabled={!mappingComplete}
            className={`px-3 py-1 text-sm rounded text-white ${
              mappingComplete ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Import {parsed?.rows.length ?? 0} incidents
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
      <p className="text-gray-700 mb-2">Drop a .csv file here, or</p>
      <label className="inline-block px-3 py-1 rounded bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
        Choose file…
        <input
          type="file"
          accept=".csv,text/csv"
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
  const set = (field) => (e) =>
    onChange({ ...mapping, [field]: e.target.value || undefined });
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Select
        label="Date / time column (required)"
        required
        value={mapping.datetime ?? ''}
        onChange={set('datetime')}
        headers={headers}
      />
      <Select
        label="Type column (required)"
        required
        value={mapping.type ?? ''}
        onChange={set('type')}
        headers={headers}
      />
      <Select
        label="Location column (required)"
        required
        value={mapping.location ?? ''}
        onChange={set('location')}
        headers={headers}
      />
      <Select
        label="Severity (optional)"
        value={mapping.severity ?? ''}
        onChange={set('severity')}
        headers={headers}
        includeNone
      />
      <Select
        label="Sub-type (optional)"
        value={mapping.subType ?? ''}
        onChange={set('subType')}
        headers={headers}
        includeNone
      />
      <Select
        label="Description / narrative (optional)"
        value={mapping.description ?? ''}
        onChange={set('description')}
        headers={headers}
        includeNone
      />
    </div>
  );
}

function Select({ label, value, onChange, headers, required = false }) {
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

function PreviewTable({ headers, rows, mapping }) {
  const used = new Set([
    mapping.datetime,
    mapping.type,
    mapping.location,
    mapping.severity,
    mapping.subType,
    mapping.description,
  ]);
  const roleFor = (h) => {
    if (h === mapping.datetime) return 'date';
    if (h === mapping.type) return 'type';
    if (h === mapping.location) return 'location';
    if (h === mapping.severity) return 'severity';
    if (h === mapping.subType) return 'subtype';
    if (h === mapping.description) return 'description';
    return null;
  };
  return (
    <div className="text-xs border border-gray-200 rounded overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h) => {
              const role = roleFor(h);
              return (
                <th
                  key={h}
                  className={`text-left px-2 py-1 border-b border-gray-200 ${
                    used.has(h) ? 'text-blue-700' : 'text-gray-500'
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
          {rows.map((r, i) => (
            <tr key={i} className="even:bg-gray-50">
              {headers.map((h) => (
                <td
                  key={h}
                  className={`px-2 py-1 border-b border-gray-100 ${
                    used.has(h) ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {r[h]}
                </td>
              ))}
            </tr>
          ))}
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
