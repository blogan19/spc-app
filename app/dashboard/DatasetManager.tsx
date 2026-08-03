'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnDef, ColumnType, Dataset, DatasetRow, TransformLogEntry, RefreshConfig } from '@/lib/dashboard/types';
import { detectPii, type PiiFlag } from '@/lib/dashboard/pii';
import { newId } from '@/lib/dashboard/seed';
import { lastRefreshedAt, PERIOD_FORMATS } from '@/lib/dashboard/refresh';
import TransformLogModal from './TransformLogModal';
import AddPeriodModal, { type RefreshTarget } from './AddPeriodModal';
import PasteDataModal from './PasteDataModal';
import FingertipsPanel from './FingertipsPanel';

interface DatasetManagerProps {
  datasets: Dataset[];
  onChange: (datasets: Dataset[]) => void;
  onClose: () => void;
}

function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  const cleanNum = (v: string) =>
    v.trim().replace(/^[£$€]/, '').replace(/,/g, '').replace(/%$/, '');
  if (nonEmpty.every((v) => cleanNum(v) !== '' && !isNaN(Number(cleanNum(v))))) return 'numeric';

  const looksDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v) ||
    /^[A-Za-z]{3}[\s\-]\d{2,4}$/.test(v) ||
    /^\d{1,2}[\-]\d{1,2}[\-]\d{2,4}$/.test(v);
  if (nonEmpty.every((v) => looksDate(v.trim()))) return 'date';

  return 'text';
}

function buildDataset(
  name: string,
  filename: string,
  fileFormat: string,
  headers: string[],
  rawRows: Record<string, string>[],
): Dataset {
  const columns: ColumnDef[] = headers.map((h) => ({
    name: h,
    type: inferColumnType(rawRows.map((r) => r[h] ?? '')),
  }));

  // Track cleaning applied per numeric column for the transform log
  type CleanRecord = { commas: number; currency: number; percent: number; example: string };
  const cleaningApplied = new Map<string, CleanRecord>();

  const rows: DatasetRow[] = rawRows.map((row) => {
    const typed: DatasetRow = {};
    columns.forEach((col) => {
      const raw = (row[col.name] ?? '').trim();
      if (col.type === 'numeric') {
        const hasComma = /,/.test(raw);
        const hasCurrency = /^[£$€]/.test(raw);
        const hasPercent = /%$/.test(raw);
        if (hasComma || hasCurrency || hasPercent) {
          const rec = cleaningApplied.get(col.name) ?? { commas: 0, currency: 0, percent: 0, example: raw };
          if (hasComma) rec.commas++;
          if (hasCurrency) rec.currency++;
          if (hasPercent) rec.percent++;
          if (!cleaningApplied.has(col.name)) rec.example = raw;
          cleaningApplied.set(col.name, rec);
        }
        const cleaned = raw.replace(/^[£$€]/, '').replace(/,/g, '').replace(/%$/, '');
        typed[col.name] = cleaned === '' ? null : Number(cleaned);
      } else {
        typed[col.name] = raw || null;
      }
    });
    return typed;
  });

  // --- Build transform log ---
  const log: TransformLogEntry[] = [];
  let step = 1;

  // Step 1: Import
  log.push({
    step: step++,
    category: 'IMPORT',
    title: 'FILE IMPORT',
    body: `Your file "${filename}" was uploaded as a ${fileFormat} file containing ${rawRows.length.toLocaleString()} rows and ${headers.length} columns. Row 1 was treated as column headers.`,
  });

  // Step 2: Column types
  const dateCols = columns.filter((c) => c.type === 'date').map((c) => c.name);
  const numCols = columns.filter((c) => c.type === 'numeric').map((c) => c.name);
  const textCols = columns.filter((c) => c.type === 'text').map((c) => c.name);
  const typeLines: string[] = [];
  if (dateCols.length) typeLines.push(`Date: ${dateCols.map((c) => `"${c}"`).join(', ')}`);
  if (numCols.length) typeLines.push(`Numeric: ${numCols.map((c) => `"${c}"`).join(', ')}`);
  if (textCols.length) typeLines.push(`Text: ${textCols.map((c) => `"${c}"`).join(', ')}`);
  log.push({
    step: step++,
    category: 'COLUMN_TYPES',
    title: 'COLUMN TYPE DETECTION',
    body:
      'Each column was automatically classified by inspecting its values:\n' +
      typeLines.join('\n') +
      '\nYou can override any column type in the Dataset Manager.',
  });

  // Step 3: Numeric cleaning (one entry per column that needed it)
  for (const [col, rec] of cleaningApplied) {
    const parts: string[] = [];
    if (rec.commas) parts.push(`${rec.commas.toLocaleString()} value${rec.commas !== 1 ? 's' : ''} contained commas (e.g. "${rec.example}") — commas removed`);
    if (rec.currency) parts.push(`${rec.currency.toLocaleString()} value${rec.currency !== 1 ? 's' : ''} had a currency symbol (£, $, €) — symbol removed`);
    if (rec.percent) parts.push(`${rec.percent.toLocaleString()} value${rec.percent !== 1 ? 's' : ''} had a % sign — sign removed; values stored as plain numbers (e.g. 12.4, not 0.124)`);
    log.push({
      step: step++,
      category: 'NUMERIC_PARSING',
      title: `NUMERIC PARSING — Column "${col}"`,
      body: parts.join('\n') + '\nNo values were changed — only formatting symbols were stripped.',
    });
  }

  // Step 4: Missing values
  for (const col of columns) {
    const nullCount = rows.filter((r) => r[col.name] === null).length;
    if (nullCount > 0) {
      log.push({
        step: step++,
        category: 'MISSING_VALUES',
        title: `MISSING VALUES — Column "${col.name}"`,
        body: `${nullCount.toLocaleString()} blank value${nullCount !== 1 ? 's' : ''} found out of ${rows.length.toLocaleString()} rows. Blank values are stored as empty — charts using this column will show a gap at those positions rather than treating blanks as zero.`,
      });
    }
  }

  return {
    id: newId(),
    name,
    filename,
    uploadedAt: new Date().toISOString(),
    columns,
    rows,
    transformLog: log,
  };
}

function findXmlRows(root: Element): Element[] {
  const queue: Element[] = [root];
  while (queue.length > 0) {
    const el = queue.shift()!;
    const children = Array.from(el.children);
    const counts = new Map<string, Element[]>();
    for (const c of children) {
      const tag = c.tagName;
      if (!counts.has(tag)) counts.set(tag, []);
      counts.get(tag)!.push(c);
    }
    let best: Element[] = [];
    for (const [, els] of counts) {
      if (els.length > best.length) best = els;
    }
    if (best.length >= 2) return best;
    queue.push(...children);
  }
  const direct = Array.from(root.children);
  return direct.length > 0 ? direct : [];
}

async function parseFile(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[]; format: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'xml') {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('File is not valid XML. Please check the file and try again.');
    }
    const rowEls = findXmlRows(doc.documentElement);
    if (rowEls.length === 0) {
      throw new Error('Could not find any data elements in the XML file.');
    }
    const headerOrder: string[] = [];
    const headerSet = new Set<string>();
    for (const el of rowEls) {
      for (const attr of Array.from(el.attributes)) {
        if (!headerSet.has(attr.name)) { headerOrder.push(attr.name); headerSet.add(attr.name); }
      }
      for (const child of Array.from(el.children)) {
        if (!headerSet.has(child.tagName)) { headerOrder.push(child.tagName); headerSet.add(child.tagName); }
      }
    }
    const rows = rowEls.map((el) => {
      const row: Record<string, string> = {};
      for (const h of headerOrder) row[h] = '';
      for (const attr of Array.from(el.attributes)) row[attr.name] = attr.value;
      for (const child of Array.from(el.children)) row[child.tagName] = child.textContent?.trim() ?? '';
      return row;
    });
    return { headers: headerOrder, rows, format: 'XML' };
  }

  if (ext === 'json') {
    const text = await file.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { throw new Error('File is not valid JSON.'); }
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Expected a JSON file containing an array of objects.');
    }
    const headers = Object.keys(data[0] as object).filter((k) => k !== '_appendedAt');
    const rows = (data as Record<string, unknown>[]).map((obj) => {
      const r: Record<string, string> = {};
      headers.forEach((h) => { r[h] = obj[h] != null ? String(obj[h]) : ''; });
      return r;
    });
    return { headers, rows, format: 'JSON' };
  }

  if (ext === 'csv' || ext === 'txt') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          resolve({
            headers: (result.meta.fields as string[]) ?? [],
            rows: result.data as Record<string, string>[],
            format: 'CSV',
          });
        },
        error: reject,
      });
    });
  }

  // Excel / ODS (xlsx library handles both)
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });
  if (raw.length === 0) return { headers: [], rows: [], format: 'Excel' };
  const headers = (raw[0] as (string | number)[]).map(String);
  const rows = (raw.slice(1) as (string | number)[][]).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ''; });
    return obj;
  });
  const format = ext === 'ods' ? 'ODS' : 'Excel';
  return { headers, rows, format };
}

interface PiiWarning {
  dataset: Dataset;
  flags: PiiFlag[];
}

export default function DatasetManager({ datasets, onChange, onClose }: DatasetManagerProps) {
  const [loading, setLoading] = useState(false);
  const [piiWarning, setPiiWarning] = useState<PiiWarning | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [logDataset, setLogDataset] = useState<Dataset | null>(null);
  const [refreshTarget, setRefreshTarget] = useState<RefreshTarget | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [showFingertips, setShowFingertips] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateRefreshConfig = (dsId: string, patch: Partial<RefreshConfig>) => {
    onChange(
      datasets.map((d) => {
        if (d.id !== dsId) return d;
        const base: RefreshConfig = {
          enabled: false,
          periodColumn: '',
          valueColumns: [],
          periodFormat: 'MMM YYYY',
          periodInterval: 'monthly',
          ...d.refreshConfig,
        };
        return { ...d, refreshConfig: { ...base, ...patch } };
      }),
    );
  };

  const handlePasteConfirm = (name: string, headers: string[], rows: Record<string, string>[]) => {
    const dataset = buildDataset(name, 'Pasted data', 'Paste', headers, rows);
    const flags = detectPii(dataset);
    if (flags.length > 0) {
      setPiiWarning({ dataset, flags });
    } else {
      onChange([...datasets, dataset]);
    }
    setShowPaste(false);
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const { headers, rows, format } = await parseFile(file);
      if (headers.length === 0) {
        window.alert('Could not read any columns from that file.');
        return;
      }
      const name = file.name.replace(/\.[^.]+$/, '');
      const dataset = buildDataset(name, file.name, format, headers, rows);
      const flags = detectPii(dataset);
      if (flags.length > 0) {
        setPiiWarning({ dataset, flags });
      } else {
        onChange([...datasets, dataset]);
      }
    } catch (err) {
      window.alert('Failed to parse file. Check it is a valid CSV or Excel file.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmPii = (action: 'remove' | 'proceed' | 'cancel') => {
    if (!piiWarning) return;
    if (action === 'cancel') {
      setPiiWarning(null);
      return;
    }
    let dataset = piiWarning.dataset;
    const piiStep = (dataset.transformLog?.length ?? 0) + 1;
    if (action === 'remove') {
      const flaggedCols = new Set(piiWarning.flags.map((f) => f.column));
      dataset = {
        ...dataset,
        columns: dataset.columns.filter((c) => !flaggedCols.has(c.name)),
        rows: dataset.rows.map((row) => {
          const r = { ...row };
          flaggedCols.forEach((c) => delete r[c]);
          return r;
        }),
        transformLog: [
          ...(dataset.transformLog ?? []),
          {
            step: piiStep,
            category: 'PII_ACTION' as const,
            title: 'PII DETECTION — Columns removed',
            body:
              `The following columns were automatically removed before import because they may contain patient-identifiable data:\n` +
              piiWarning.flags.map((f) => `• "${f.column}" — ${f.reason}`).join('\n'),
          },
        ],
      };
    } else {
      dataset = {
        ...dataset,
        transformLog: [
          ...(dataset.transformLog ?? []),
          {
            step: piiStep,
            category: 'PII_ACTION' as const,
            title: 'PII DETECTION — False positive acknowledged',
            body:
              `The following columns triggered a PII warning but the user confirmed they do not contain patient-identifiable data:\n` +
              piiWarning.flags.map((f) => `• "${f.column}" — ${f.reason}`).join('\n') +
              '\nUser provided written confirmation that this is a false positive.',
          },
        ],
      };
    }
    onChange([...datasets, dataset]);
    setPiiWarning(null);
  };

  const startRename = (dataset: Dataset) => {
    setEditingId(dataset.id);
    setEditingName(dataset.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    onChange(datasets.map((d) => (d.id === editingId ? { ...d, name: editingName.trim() || d.name } : d)));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this dataset?')) return;
    onChange(datasets.filter((d) => d.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Datasets</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {datasets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No datasets yet. Upload a CSV or Excel file to get started.
            </p>
          ) : (
            datasets.map((ds) => (
              <div
                key={ds.id}
                className="border border-gray-200 rounded-xl p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  {editingId === ds.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                      autoFocus
                      className="text-sm font-semibold text-gray-900 border border-blue-400 rounded px-1 w-full"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startRename(ds)}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left truncate w-full"
                      title="Click to rename"
                    >
                      {ds.name}
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{ds.filename} · {ds.rows.length.toLocaleString()} rows · {ds.columns.length} columns</span>
                    {(() => {
                      const lr = lastRefreshedAt(ds);
                      return lr ? (
                        <span className="text-emerald-600">
                          Refreshed {new Date(lr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : null;
                    })()}
                    {ds.transformLog && ds.transformLog.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLogDataset(ds)}
                        className="text-[#005EB8] hover:underline flex items-center gap-0.5"
                        title="View transformation log"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                        </svg>
                        Transformations
                      </button>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ds.columns.slice(0, 6).map((col) => (
                      <span
                        key={col.name}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        title={col.type}
                      >
                        {col.name}
                        <span className="ml-1 text-gray-400">
                          {col.type === 'numeric' ? '#' : col.type === 'date' ? '📅' : 'A'}
                        </span>
                      </span>
                    ))}
                    {ds.columns.length > 6 && (
                      <span className="text-xs text-gray-400">+{ds.columns.length - 6} more</span>
                    )}
                  </div>

                  {/* Monthly refresh config */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {!ds.refreshConfig?.enabled ? (
                      <button
                        type="button"
                        onClick={() => updateRefreshConfig(ds.id, { enabled: true })}
                        className="text-xs text-gray-400 hover:text-[#005EB8] transition-colors"
                      >
                        + Enable monthly refresh
                      </button>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">Monthly refresh</span>
                          <button
                            type="button"
                            onClick={() => updateRefreshConfig(ds.id, { enabled: false })}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Disable
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Period column</label>
                            <select
                              value={ds.refreshConfig.periodColumn}
                              onChange={(e) => updateRefreshConfig(ds.id, { periodColumn: e.target.value })}
                              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select column…</option>
                              {ds.columns.map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Interval</label>
                            <select
                              value={ds.refreshConfig.periodInterval}
                              onChange={(e) =>
                                updateRefreshConfig(ds.id, {
                                  periodInterval: e.target.value as RefreshConfig['periodInterval'],
                                })
                              }
                              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="weekly">Weekly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Period label format</label>
                          <select
                            value={ds.refreshConfig.periodFormat}
                            onChange={(e) => updateRefreshConfig(ds.id, { periodFormat: e.target.value })}
                            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {PERIOD_FORMATS.map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {ds.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric').length > 0 && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Value columns (select all that update each period)</label>
                            <div className="flex flex-wrap gap-1.5">
                              {ds.columns
                                .filter((c) => (c.typeOverride ?? c.type) === 'numeric')
                                .map((c) => {
                                  const checked = ds.refreshConfig?.valueColumns.includes(c.name) ?? false;
                                  return (
                                    <label
                                      key={c.name}
                                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                                        checked
                                          ? 'border-[#005EB8] bg-blue-50 text-[#005EB8]'
                                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={checked}
                                        onChange={(e) => {
                                          const cols = ds.refreshConfig?.valueColumns ?? [];
                                          updateRefreshConfig(ds.id, {
                                            valueColumns: e.target.checked
                                              ? [...cols, c.name]
                                              : cols.filter((x) => x !== c.name),
                                          });
                                        }}
                                      />
                                      {c.name}
                                    </label>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {ds.refreshConfig.periodColumn && ds.refreshConfig.valueColumns.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRefreshTarget({ dataset: ds, config: ds.refreshConfig! })
                            }
                            className="w-full text-xs py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium"
                          >
                            + Add new period
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(ds.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                  aria-label="Delete dataset"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt,.json,.ods,.xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-sm text-gray-600 hover:text-blue-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Uploading…' : '+ Upload file (CSV, Excel, JSON, ODS, XML)'}
          </button>
          <button
            type="button"
            onClick={() => setShowPaste(true)}
            className="w-full mt-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-[#005EB8] hover:border-[#005EB8] hover:bg-blue-50/40 transition-all"
          >
            Paste data from clipboard or spreadsheet
          </button>
          <button
            type="button"
            onClick={() => setShowFingertips(true)}
            className="w-full mt-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-[#005EB8] hover:border-[#005EB8] hover:bg-blue-50/40 transition-all flex items-center justify-center gap-2"
          >
            <span className="inline-block w-4 h-4 rounded-sm bg-[#005EB8] text-white text-[9px] font-bold leading-4 text-center flex-shrink-0">NHS</span>
            From NHS Fingertips
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            CSV, Excel, JSON, ODS, XML supported. Max recommended: 50,000 rows.
          </p>
        </div>
      </div>

      {/* Transform log modal */}
      {logDataset && (
        <TransformLogModal dataset={logDataset} onClose={() => setLogDataset(null)} />
      )}

      {/* Add new period modal */}
      {refreshTarget && (
        <AddPeriodModal
          targets={[refreshTarget]}
          onSave={([updated]) => {
            onChange(datasets.map((d) => (d.id === updated.id ? updated : d)));
            setRefreshTarget(null);
          }}
          onClose={() => setRefreshTarget(null)}
        />
      )}

      {/* Paste data modal */}
      {showPaste && (
        <PasteDataModal
          onConfirm={handlePasteConfirm}
          onClose={() => setShowPaste(false)}
        />
      )}

      {/* NHS Fingertips panel */}
      {showFingertips && (
        <FingertipsPanel
          onAddDataset={(ds) => { onChange([...datasets, ds]); }}
          onClose={() => setShowFingertips(false)}
        />
      )}

      {/* PII warning modal */}
      {piiWarning && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-gray-900">Possible patient data detected</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This tool is for aggregate, anonymised data only. The following columns may contain
                  patient-identifiable information:
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {piiWarning.flags.map((f) => (
                <li key={f.column} className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <span className="font-medium text-amber-800">{f.column}</span>
                  <br />
                  <span className="text-amber-700 text-xs">{f.reason}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => confirmPii('remove')}
                className="w-full py-2 rounded-lg bg-[#005EB8] text-white text-sm font-medium hover:bg-[#003087]"
              >
                Remove flagged columns and continue
              </button>
              <button
                type="button"
                onClick={() => confirmPii('cancel')}
                className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Cancel upload
              </button>
              <button
                type="button"
                onClick={() => {
                  const phrase = window.prompt(
                    'This is a false positive. Type "I confirm this is not patient data" to continue.',
                  );
                  if (phrase?.toLowerCase().includes('not patient data')) {
                    confirmPii('proceed');
                  }
                }}
                className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                This is a false positive — proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
