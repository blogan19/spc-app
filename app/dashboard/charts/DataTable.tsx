'use client';

import { useMemo, useState } from 'react';
import type { DatasetRow, ConditionalFormat } from '@/lib/dashboard/types';

const CF_STYLES: Record<ConditionalFormat['color'], string> = {
  red:   'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
};

function evalFormat(value: DatasetRow[string], fmt: ConditionalFormat): boolean {
  if (typeof value !== 'number') return false;
  switch (fmt.operator) {
    case '>':  return value > fmt.threshold;
    case '<':  return value < fmt.threshold;
    case '>=': return value >= fmt.threshold;
    case '<=': return value <= fmt.threshold;
    case '==': return value === fmt.threshold;
    case '!=': return value !== fmt.threshold;
  }
}

function getCellStyle(col: string, value: DatasetRow[string], formats: ConditionalFormat[]): string {
  for (const fmt of formats) {
    if (fmt.column === col && evalFormat(value, fmt)) return CF_STYLES[fmt.color];
  }
  return '';
}

interface DataTableProps {
  data: DatasetRow[];
  columns: string[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  conditionalFormats: ConditionalFormat[];
  title?: string;
  compact?: boolean;
}

export default function DataTable({
  data,
  columns,
  sortColumn,
  sortDirection,
  pageSize,
  conditionalFormats,
  title,
  compact = false,
}: DataTableProps) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(sortColumn);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(sortDirection);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const visible = sorted.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  const handleHeaderClick = (col: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const cell = compact ? 'px-2 py-0.5' : 'px-3 py-1.5';
  const fs = compact ? 'text-[11px]' : 'text-[13px]';

  return (
    <div className={`h-full flex flex-col overflow-hidden ${fs}`}>
      {title && (
        <div className={`${cell} font-semibold text-gray-800 border-b border-gray-100 flex-shrink-0 leading-6`}>
          {title}
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={(e) => handleHeaderClick(col, e)}
                  className={`${cell} text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none`}
                >
                  {col}
                  {sortCol === col && (
                    <span className="ml-1 text-gray-400 text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`${cell} text-center text-gray-400 py-6`}>
                  No data
                </td>
              </tr>
            ) : (
              visible.map((row, ri) => (
                <tr key={ri} className={ri % 2 !== 0 ? 'bg-gray-50/60' : ''}>
                  {columns.map((col) => {
                    const value = row[col];
                    const cfStyle = getCellStyle(col, value, conditionalFormats);
                    const display =
                      value === null || value === undefined
                        ? '—'
                        : typeof value === 'number'
                          ? value.toLocaleString()
                          : String(value);
                    return (
                      <td
                        key={col}
                        className={`${cell} border-b border-gray-100 ${cfStyle || 'text-gray-700'}`}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-3 py-1 border-t border-gray-100 bg-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 px-1"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            {clampedPage + 1} / {totalPages} &nbsp;·&nbsp; {sorted.length.toLocaleString()} rows
          </span>
          <button
            type="button"
            disabled={clampedPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 px-1"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
