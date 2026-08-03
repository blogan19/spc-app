'use client';

import { useState } from 'react';
import type { Dataset, DataTableTileConfig, ConditionalFormat } from '@/lib/dashboard/types';
import DataTable from './charts/DataTable';

interface DataTableTileEditorProps {
  datasets: Dataset[];
  initialConfig?: DataTableTileConfig;
  onSave: (config: DataTableTileConfig) => void;
  onCancel: () => void;
}

const OPERATORS: ConditionalFormat['operator'][] = ['>', '<', '>=', '<=', '==', '!='];
const CF_COLOR_LABELS: Record<ConditionalFormat['color'], string> = {
  red: 'Red',
  amber: 'Amber',
  green: 'Green',
};

const defaultConfig = (datasetId = '', columns: string[] = []): DataTableTileConfig => ({
  datasetId,
  title: '',
  visibleColumns: columns,
  sortColumn: '',
  sortDirection: 'asc',
  pageSize: 20,
  conditionalFormats: [],
});

export default function DataTableTileEditor({
  datasets,
  initialConfig,
  onSave,
  onCancel,
}: DataTableTileEditorProps) {
  const firstDs = datasets[0];
  const initDs = initialConfig
    ? datasets.find((d) => d.id === initialConfig.datasetId) ?? null
    : firstDs ?? null;

  const [config, setConfig] = useState<DataTableTileConfig>(
    initialConfig ?? defaultConfig(initDs?.id ?? '', initDs?.columns.map((c) => c.name) ?? []),
  );

  const set = <K extends keyof DataTableTileConfig>(k: K, v: DataTableTileConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const activeDataset = datasets.find((d) => d.id === config.datasetId) ?? null;
  const allColumns = activeDataset?.columns.map((c) => c.name) ?? [];
  const numericColumns = activeDataset?.columns.filter((c) => (c.typeOverride ?? c.type) === 'numeric').map((c) => c.name) ?? [];

  const visibleCols = config.visibleColumns.length > 0 ? config.visibleColumns : allColumns;

  const handleDatasetChange = (dsId: string) => {
    const ds = datasets.find((d) => d.id === dsId);
    setConfig(defaultConfig(dsId, ds?.columns.map((c) => c.name) ?? []));
  };

  const toggleColumn = (col: string, checked: boolean) => {
    const current = config.visibleColumns.length > 0 ? config.visibleColumns : allColumns;
    const next = checked ? [...current, col] : current.filter((c) => c !== col);
    set('visibleColumns', next.length === allColumns.length ? [] : next);
  };

  const addFormat = () => {
    if (numericColumns.length === 0) return;
    const fmt: ConditionalFormat = {
      column: numericColumns[0],
      operator: '>',
      threshold: 0,
      color: 'red',
    };
    set('conditionalFormats', [...config.conditionalFormats, fmt]);
  };

  const updateFormat = (i: number, patch: Partial<ConditionalFormat>) => {
    set(
      'conditionalFormats',
      config.conditionalFormats.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    );
  };

  const removeFormat = (i: number) => {
    set('conditionalFormats', config.conditionalFormats.filter((_, idx) => idx !== i));
  };

  const canSave = !!config.datasetId && visibleCols.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Settings panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Data Table</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Dataset */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dataset</label>
            {datasets.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                No datasets uploaded yet. Close this editor and upload a dataset first.
              </p>
            ) : (
              <select
                value={config.datasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select dataset…</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            )}
          </div>

          {activeDataset && (
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Table title (optional)</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. ED Attendances Q1"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Column visibility */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  Visible columns
                  <button
                    type="button"
                    onClick={() => set('visibleColumns', [])}
                    className="ml-2 text-[#005EB8] hover:underline font-normal"
                  >
                    Show all
                  </button>
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {allColumns.map((col) => {
                    const checked = visibleCols.includes(col);
                    return (
                      <label key={col} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleColumn(col, e.target.checked)}
                          className="rounded"
                        />
                        <span className={checked ? 'text-gray-700' : 'text-gray-400'}>{col}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Sort</p>
                <div className="flex gap-2">
                  <select
                    value={config.sortColumn}
                    onChange={(e) => set('sortColumn', e.target.value)}
                    className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {visibleCols.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <select
                    value={config.sortDirection}
                    onChange={(e) => set('sortDirection', e.target.value as 'asc' | 'desc')}
                    disabled={!config.sortColumn}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="asc">↑ Asc</option>
                    <option value="desc">↓ Desc</option>
                  </select>
                </div>
              </div>

              {/* Page size */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rows per page</label>
                <div className="flex gap-2">
                  {[10, 20, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('pageSize', n)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                        config.pageSize === n
                          ? 'border-[#005EB8] bg-blue-50 text-[#005EB8] font-medium'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional formatting */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-600">Conditional formatting</p>
                  {config.conditionalFormats.length < 5 && numericColumns.length > 0 && (
                    <button
                      type="button"
                      onClick={addFormat}
                      className="text-xs text-[#005EB8] hover:underline"
                    >
                      + Add rule
                    </button>
                  )}
                </div>
                {numericColumns.length === 0 ? (
                  <p className="text-xs text-gray-400">No numeric columns to format.</p>
                ) : config.conditionalFormats.length === 0 ? (
                  <p className="text-xs text-gray-400">No rules yet.</p>
                ) : (
                  <div className="space-y-2">
                    {config.conditionalFormats.map((fmt, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={fmt.column}
                            onChange={(e) => updateFormat(i, { column: e.target.value })}
                            className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {numericColumns.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeFormat(i)}
                            className="text-gray-400 hover:text-red-500 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={fmt.operator}
                            onChange={(e) => updateFormat(i, { operator: e.target.value as ConditionalFormat['operator'] })}
                            className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none"
                          >
                            {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                          </select>
                          <input
                            type="number"
                            value={fmt.threshold}
                            onChange={(e) => updateFormat(i, { threshold: Number(e.target.value) })}
                            className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                          />
                          <div className="flex gap-1">
                            {(['red', 'amber', 'green'] as const).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateFormat(i, { color: c })}
                                title={CF_COLOR_LABELS[c]}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  fmt.color === c ? 'border-gray-700 scale-110' : 'border-transparent opacity-60'
                                } ${c === 'red' ? 'bg-red-400' : c === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(config)}
            className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add to dashboard
          </button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="flex-1 bg-gray-100 flex flex-col overflow-hidden">
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">Preview</span>
          {activeDataset && (
            <span className="text-xs text-gray-400">
              {activeDataset.rows.length.toLocaleString()} rows · {visibleCols.length} columns shown
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden p-6">
          {!activeDataset ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a dataset to preview
            </div>
          ) : (
            <div className="h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <DataTable
                data={activeDataset.rows}
                columns={visibleCols}
                sortColumn={config.sortColumn}
                sortDirection={config.sortDirection}
                pageSize={config.pageSize}
                conditionalFormats={config.conditionalFormats}
                title={config.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
