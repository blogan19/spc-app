'use client';

import { useState, useRef } from 'react';
import { newId } from '@/lib/dashboard/seed';

interface CreateDatasetModalProps {
  onConfirm: (name: string, headers: string[], rows: Record<string, string>[]) => void;
  onClose: () => void;
}

interface ColDef {
  id: string;
  name: string;
}

const DEFAULT_COLS: ColDef[] = [
  { id: 'c1', name: 'Month' },
  { id: 'c2', name: 'Value' },
];

export default function CreateDatasetModal({ onConfirm, onClose }: CreateDatasetModalProps) {
  const [datasetName, setDatasetName] = useState('New dataset');
  const [columns, setColumns] = useState<ColDef[]>(DEFAULT_COLS);
  const [rows, setRows] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => DEFAULT_COLS.map(() => '')),
  );
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const focusCell = (r: number, c: number, deferred = false) => {
    const go = () => cellRefs.current.get(`${r}-${c}`)?.focus();
    deferred ? setTimeout(go, 0) : go();
  };

  function addColumn() {
    const col: ColDef = { id: newId(), name: `Column ${columns.length + 1}` };
    setColumns((prev) => [...prev, col]);
    setRows((prev) => prev.map((r) => [...r, '']));
  }

  function deleteColumn(ci: number) {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== ci));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== ci)));
  }

  function addRow() {
    setRows((prev) => [...prev, columns.map(() => '')]);
  }

  function deleteRow(ri: number) {
    setRows((prev) => prev.filter((_, i) => i !== ri));
  }

  function setCell(ri: number, ci: number, val: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === ri ? r.map((v, j) => (j === ci ? val : v)) : r)),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent, ri: number, ci: number) {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        if (ci < columns.length - 1) focusCell(ri, ci + 1);
        else if (ri < rows.length - 1) focusCell(ri + 1, 0);
        else { addRow(); focusCell(ri + 1, 0, true); }
      } else {
        if (ci > 0) focusCell(ri, ci - 1);
        else if (ri > 0) focusCell(ri - 1, columns.length - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (ri < rows.length - 1) focusCell(ri + 1, ci);
      else { addRow(); focusCell(ri + 1, ci, true); }
    }
  }

  function handleConfirm() {
    const headers = columns.map((c, i) => c.name.trim() || `Column ${i + 1}`);
    const rowObjs = rows
      .filter((r) => r.some((v) => v.trim()))
      .map((r) =>
        Object.fromEntries(
          columns.map((c, i) => [c.name.trim() || `Column ${i + 1}`, r[i] ?? '']),
        ),
      );
    onConfirm(datasetName.trim() || 'New dataset', headers, rowObjs);
  }

  const hasData = rows.some((r) => r.some((v) => v.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create dataset</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define columns and type data directly — use Tab or Enter to move between cells.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Dataset name</label>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-auto p-4">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 w-8 text-xs text-gray-400 font-normal px-2 py-1.5 select-none">
                  #
                </th>
                {columns.map((col, ci) => (
                  <th key={col.id} className="border border-gray-200 bg-gray-50 p-0" style={{ minWidth: 130 }}>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) =>
                          setColumns((prev) => prev.map((c, i) => i === ci ? { ...c, name: e.target.value } : c))
                        }
                        className="flex-1 text-xs font-semibold text-gray-700 bg-transparent px-2 py-1.5 focus:outline-none min-w-0"
                        placeholder={`Column ${ci + 1}`}
                      />
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteColumn(ci)}
                          title="Remove column"
                          className="mr-1 p-0.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5">
                            <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="border-0 pl-2 align-middle">
                  <button
                    type="button"
                    onClick={addColumn}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-indigo-600 border border-dashed border-gray-300 hover:border-indigo-400 rounded transition-colors whitespace-nowrap"
                  >
                    + col
                  </button>
                </th>
                <th className="w-5 border-0" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="group">
                  <td className="border border-gray-200 bg-gray-50/50 text-xs text-gray-300 text-center px-2 select-none">
                    {ri + 1}
                  </td>
                  {columns.map((col, ci) => (
                    <td key={col.id} className="border border-gray-200 p-0">
                      <input
                        ref={(el) => {
                          if (el) cellRefs.current.set(`${ri}-${ci}`, el);
                          else cellRefs.current.delete(`${ri}-${ci}`);
                        }}
                        type="text"
                        value={row[ci] ?? ''}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                        className="w-full text-sm px-2 py-1.5 focus:outline-none focus:bg-indigo-50/60"
                      />
                    </td>
                  ))}
                  <td className="border-0 pl-1 w-5">
                    <button
                      type="button"
                      onClick={() => deleteRow(ri)}
                      title="Remove row"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                        <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={columns.length + 3} className="pt-1">
                  <button
                    type="button"
                    onClick={() => { addRow(); focusCell(rows.length, 0, true); }}
                    className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 transition-colors"
                  >
                    + Add row
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
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
            disabled={!hasData}
            onClick={handleConfirm}
            className="flex-1 text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create dataset
          </button>
        </div>
      </div>
    </div>
  );
}
