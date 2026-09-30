'use client';

import { useRef } from 'react';
import type { Dataset, ColumnDef, DatasetRow } from '@/lib/dashboard/types';

export interface ColSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder?: string;
}

interface Props {
  columns: ColSpec[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
}

function emptyRow(columns: ColSpec[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, '']));
}

export function buildInlineDataset(
  id: string,
  chartName: string,
  columns: ColSpec[],
  rows: Record<string, string>[],
): Dataset {
  const colDefs: ColumnDef[] = columns.map((c) => ({
    name: c.key,
    type: c.type === 'number' ? 'numeric' : c.type === 'date' ? 'date' : 'text',
  }));
  const dataRows: DatasetRow[] = rows.map((r) =>
    Object.fromEntries(
      columns.map((c) => {
        const raw = r[c.key] ?? '';
        if (c.type === 'number') {
          const n = parseFloat(raw);
          return [c.key, isNaN(n) ? null : n];
        }
        return [c.key, raw === '' ? null : raw];
      }),
    ),
  );
  return {
    id,
    name: chartName || 'Inline data',
    filename: '',
    uploadedAt: new Date().toISOString(),
    columns: colDefs,
    rows: dataRows,
  };
}

export default function InlineDataEditor({ columns, rows, onChange }: Props) {
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  const seed = rows.length === 0 ? [emptyRow(columns), emptyRow(columns), emptyRow(columns)] : rows;
  const display = seed;

  const update = (rowIdx: number, key: string, value: string) => {
    const next = display.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r));
    onChange(next);
  };

  const addRow = () => onChange([...display, emptyRow(columns)]);

  const deleteRow = (i: number) => {
    const next = display.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [emptyRow(columns)]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    // Detect delimiter: tab (Excel/Sheets) or comma
    const delimiter = text.includes('\t') ? '\t' : ',';
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;

    // Check if first row looks like a header (non-numeric first cell in first col)
    let dataLines = lines;
    const firstCell = lines[0].split(delimiter)[0].trim();
    const looksLikeHeader = isNaN(Number(firstCell)) && !/^\d{4}-\d{2}-\d{2}/.test(firstCell);
    if (looksLikeHeader) dataLines = lines.slice(1);

    if (!dataLines.length) return;
    e.preventDefault();

    const parsed: Record<string, string>[] = dataLines.map((line) => {
      const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(columns.map((col, ci) => [col.key, cells[ci] ?? '']));
    });
    onChange(parsed);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" onPaste={handlePaste}>
      <div className="overflow-auto max-h-60">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {display.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                {columns.map((col) => (
                  <td key={col.key} className="p-0">
                    <input
                      type={col.type === 'date' ? 'date' : col.type === 'number' ? 'text' : 'text'}
                      inputMode={col.type === 'number' ? 'decimal' : undefined}
                      value={row[col.key] ?? ''}
                      onChange={(e) => update(ri, col.key, e.target.value)}
                      placeholder={col.placeholder}
                      className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-indigo-400 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => deleteRow(ri)}
                    className="text-gray-300 hover:text-red-400 px-1.5 py-1 transition-colors"
                    aria-label="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          + Add row
        </button>
        <span className="text-xs text-gray-400">or paste from Excel / Sheets</span>
        {display.length > 1 && (
          <button
            type="button"
            onClick={() => onChange([emptyRow(columns)])}
            className="text-xs text-gray-400 hover:text-red-500 ml-auto transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {/* Hidden textarea keeps focus for paste events */}
      <textarea ref={pasteRef} className="sr-only" aria-hidden />
    </div>
  );
}
