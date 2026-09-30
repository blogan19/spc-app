'use client';

import type { Dataset } from '@/lib/dashboard/types';

interface DrillThroughModalProps {
  dataset: Dataset;
  filterColumn: string;
  filterValue: string;
  chartName: string;
  onClose: () => void;
}

export default function DrillThroughModal({
  dataset,
  filterColumn,
  filterValue,
  chartName,
  onClose,
}: DrillThroughModalProps) {
  const matchingRows = dataset.rows.filter((row) => {
    const v = row[filterColumn];
    return v != null && String(v) === filterValue;
  });

  const visibleCols = dataset.columns
    .filter((c) => !c.name.startsWith('_'))
    .map((c) => c.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{chartName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Filtered to{' '}
              <span className="font-medium text-gray-800">{filterColumn}</span>
              {' = '}
              <span className="font-medium text-indigo-600">{filterValue}</span>
              {' · '}
              <span className="text-gray-500">{matchingRows.length} row{matchingRows.length !== 1 ? 's' : ''} from {dataset.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 ml-4 flex-shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {matchingRows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No rows match this filter.
            </div>
          ) : (
            <table className="w-full text-xs border-collapse" aria-label={`Rows where ${filterColumn} = ${filterValue}`}>
              <thead className="sticky top-0">
                <tr>
                  {visibleCols.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={`text-left px-3 py-2 bg-gray-50 border border-gray-200 font-medium text-gray-700 whitespace-nowrap
                                  ${col === filterColumn ? 'bg-indigo-50 text-indigo-600' : ''}`}
                    >
                      {col}
                      {col === filterColumn && (
                        <span className="ml-1 text-indigo-600 opacity-60">▼</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchingRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {visibleCols.map((col) => (
                      <td
                        key={col}
                        className={`px-3 py-1.5 border border-gray-100 text-gray-700 whitespace-nowrap
                                    ${col === filterColumn ? 'font-medium text-indigo-600 bg-indigo-50/40' : ''}`}
                      >
                        {row[col] == null ? <span className="text-gray-300 italic">—</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">
            {dataset.columns.length} columns · {matchingRows.length} of {dataset.rows.length} rows shown
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
