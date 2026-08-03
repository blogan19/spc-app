'use client';

import { useState, useCallback } from 'react';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: 'tab' | 'comma' | 'semicolon';
}

function detectDelimiter(firstLine: string): 'tab' | 'comma' | 'semicolon' {
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis) return 'tab';
  if (semis > commas) return 'semicolon';
  return 'comma';
}

const DELIM_CHAR = { tab: '\t', comma: ',', semicolon: ';' } as const;
const DELIM_LABEL = { tab: 'Tab-separated (Excel)', comma: 'Comma-separated (CSV)', semicolon: 'Semicolon-separated' } as const;

function splitRow(line: string, delim: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === delim && !inQuote) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parsePaste(text: string): ParsedData | null {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 1) return null;

  const delimiter = detectDelimiter(lines[0]);
  const delim = DELIM_CHAR[delimiter];

  const headers = splitRow(lines[0], delim).map((h, i) => h || `Column ${i + 1}`);
  if (headers.length === 0) return null;

  const dataLines = lines.length > 1 ? lines.slice(1) : [];
  const rows = dataLines.map((line) => {
    const cells = splitRow(line, delim);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });

  return { headers, rows, delimiter };
}

interface PasteDataModalProps {
  onConfirm: (name: string, headers: string[], rows: Record<string, string>[]) => void;
  onClose: () => void;
}

export default function PasteDataModal({ onConfirm, onClose }: PasteDataModalProps) {
  const [text, setText] = useState('');
  const [name, setName] = useState('Pasted data');
  const [clipboardError, setClipboardError] = useState('');

  const parsed = text.trim() ? parsePaste(text) : null;

  const readClipboard = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      setClipboardError('');
    } catch {
      setClipboardError('Clipboard access denied — paste data manually into the box below.');
    }
  }, []);

  const canConfirm = !!parsed && parsed.headers.length > 0 && name.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Paste data</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Copy a table from Excel, a web page, or any other source and paste it here.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Clipboard button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={readClipboard}
              className="text-sm px-3 py-1.5 rounded-lg border border-[#005EB8] text-[#005EB8] hover:bg-blue-50 transition-colors"
            >
              Read from clipboard
            </button>
            <span className="text-xs text-gray-400">or paste manually below (Ctrl+V / Cmd+V)</span>
          </div>
          {clipboardError && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{clipboardError}</p>
          )}

          {/* Paste area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your data here — first row should be column headers&#10;Month&#9;Attendances&#9;Admissions&#10;Jan 2025&#9;4231&#9;812&#10;Feb 2025&#9;4105&#9;791"
            rows={6}
            className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />

          {/* Detection result */}
          {parsed && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 text-[#005EB8] rounded-full font-medium">
                {DELIM_LABEL[parsed.delimiter]}
              </span>
              <span>{parsed.headers.length} columns · {parsed.rows.length} row{parsed.rows.length !== 1 ? 's' : ''} detected</span>
            </div>
          )}

          {/* Preview table */}
          {parsed && parsed.headers.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
                Preview (first {Math.min(5, parsed.rows.length)} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {parsed.headers.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className={ri % 2 !== 0 ? 'bg-gray-50/50' : ''}>
                        {parsed.headers.map((h) => (
                          <td key={h} className="px-3 py-1 text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-[160px] truncate">
                            {row[h] || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                  … and {parsed.rows.length - 5} more row{parsed.rows.length - 5 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {text && !parsed && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Could not detect columns. Make sure the first row contains headers and values are separated by tabs, commas, or semicolons.
            </p>
          )}

          {/* Dataset name */}
          {parsed && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dataset name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => parsed && onConfirm(name.trim(), parsed.headers, parsed.rows)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Import dataset
          </button>
        </div>
      </div>
    </div>
  );
}
