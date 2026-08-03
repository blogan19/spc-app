'use client';

import { useRef, useState } from 'react';
import {
  searchIndicators,
  fetchIndicatorData,
  AREA_TYPE_OPTIONS,
  type FingertipsIndicator,
  type FingertipsDataPoint,
} from '@/lib/dashboard/fingertips';
import type { Dataset, ColumnDef, DatasetRow } from '@/lib/dashboard/types';

interface FingertipsPanelProps {
  onAddDataset: (dataset: Dataset) => void;
  onClose: () => void;
}

type Step = 'search' | 'configure' | 'preview';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildDataset(
  name: string,
  indicator: FingertipsIndicator,
  points: FingertipsDataPoint[],
  includeCount: boolean,
): Dataset {
  const columns: ColumnDef[] = [
    { name: 'Area Code', type: 'text' },
    { name: 'Area Name', type: 'text' },
    { name: 'Period', type: 'text' },
    { name: 'Value', type: 'numeric' },
  ];
  if (includeCount) {
    columns.push({ name: 'Count', type: 'numeric' });
    columns.push({ name: 'Denominator', type: 'numeric' });
  }

  const rows: DatasetRow[] = points.map((p) => {
    const row: DatasetRow = {
      'Area Code': p.AreaCode,
      'Area Name': p.AreaName,
      'Period': p.Period,
      'Value': p.Value,
    };
    if (includeCount) {
      row['Count'] = p.Count;
      row['Denominator'] = p.Denominator;
    }
    return row;
  });

  return {
    id: uid(),
    name,
    filename: `fingertips-${indicator.IndicatorId}.json`,
    uploadedAt: new Date().toISOString(),
    columns,
    rows,
    transformLog: [{
      step: 1,
      category: 'IMPORT',
      title: 'Imported from NHS Fingertips',
      body: `Indicator ${indicator.IndicatorId}: ${indicator.IndicatorName}`,
    }],
  };
}

export default function FingertipsPanel({ onAddDataset, onClose }: FingertipsPanelProps) {
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FingertipsIndicator[]>([]);
  const [searchError, setSearchError] = useState('');

  const [indicator, setIndicator] = useState<FingertipsIndicator | null>(null);
  const [areaTypeId, setAreaTypeId] = useState<number>(AREA_TYPE_OPTIONS[2].Id); // ICB default
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [points, setPoints] = useState<FingertipsDataPoint[]>([]);
  const [includeCount, setIncludeCount] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setResults([]);
    try {
      const res = await searchIndicators(query);
      setResults(res.slice(0, 50));
      if (res.length === 0) setSearchError('No indicators found. Try different keywords.');
    } catch {
      setSearchError('Search failed. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectIndicator = (ind: FingertipsIndicator) => {
    setIndicator(ind);
    setDatasetName(ind.IndicatorName.slice(0, 60));
    setStep('configure');
    setFetchError('');
  };

  const handleFetch = async () => {
    if (!indicator) return;
    setFetching(true);
    setFetchError('');
    try {
      const data = await fetchIndicatorData(indicator.IndicatorId, areaTypeId);
      if (data.length === 0) {
        setFetchError('No data returned for this indicator and area type combination.');
        setFetching(false);
        return;
      }
      setPoints(data);
      setStep('preview');
    } catch (err) {
      setFetchError(String(err));
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = () => {
    if (!indicator) return;
    const ds = buildDataset(datasetName || indicator.IndicatorName, indicator, points, includeCount);
    onAddDataset(ds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-[520px] bg-white h-full flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'search' && (
              <button
                type="button"
                onClick={() => { setStep(step === 'preview' ? 'configure' : 'search'); }}
                className="text-gray-400 hover:text-gray-600 mr-1"
                title="Back"
              >
                ←
              </button>
            )}
            <h2 className="text-base font-semibold text-gray-900">NHS Fingertips</h2>
            <span className="text-xs text-gray-400 font-normal">Public Health England data</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 border-b border-gray-100 flex-shrink-0">
          {(['search', 'configure', 'preview'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-2 text-center text-xs font-medium border-b-2 transition-colors ${
                step === s ? 'border-[#005EB8] text-[#005EB8]' : 'border-transparent text-gray-400'
              }`}
            >
              {i + 1}. {s === 'search' ? 'Find indicator' : s === 'configure' ? 'Configure' : 'Preview & add'}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Search 2,000+ public health indicators from the{' '}
                <span className="font-medium text-gray-800">NHS Fingertips</span> platform.
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. diabetes, cancer screening, obesity…"
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#005EB8]"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="px-4 py-2 text-sm bg-[#005EB8] text-white rounded-lg font-medium disabled:opacity-40 hover:bg-[#003087] transition-colors"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>

              {searchError && <p className="text-sm text-red-600">{searchError}</p>}

              {results.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">{results.length} results</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {results.map((ind) => (
                      <button
                        key={ind.IndicatorId}
                        type="button"
                        onClick={() => handleSelectIndicator(ind)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 group-hover:text-[#005EB8] leading-snug">{ind.IndicatorName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">ID: {ind.IndicatorId}</p>
                          </div>
                          <span className="text-gray-300 group-hover:text-[#005EB8] text-sm flex-shrink-0">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && indicator && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Selected indicator</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{indicator.IndicatorName}</p>
                <p className="text-xs text-gray-500 mt-1">ID: {indicator.IndicatorId}</p>
                {indicator.Descriptive?.Definition && (
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">{indicator.Descriptive.Definition}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Geography level</label>
                <select
                  value={areaTypeId}
                  onChange={(e) => setAreaTypeId(Number(e.target.value))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#005EB8]"
                >
                  {AREA_TYPE_OPTIONS.map((a) => (
                    <option key={a.Id} value={a.Id}>{a.Name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Data is returned for all areas at this level.</p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCount}
                  onChange={(e) => setIncludeCount(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-[#005EB8]"
                />
                <span className="text-sm text-gray-700">Include count and denominator columns</span>
              </label>

              {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}

              <button
                type="button"
                onClick={handleFetch}
                disabled={fetching}
                className="w-full py-2.5 text-sm bg-[#005EB8] text-white rounded-xl font-medium disabled:opacity-40 hover:bg-[#003087] transition-colors"
              >
                {fetching ? 'Fetching data…' : 'Fetch data →'}
              </button>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && indicator && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">{points.length.toLocaleString()} rows fetched</p>
                <span className="text-xs text-gray-400">
                  {AREA_TYPE_OPTIONS.find((a) => a.Id === areaTypeId)?.Name}
                </span>
              </div>

              {/* Preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Area</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Period</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Value</th>
                        {includeCount && <th className="text-right px-3 py-2 font-medium text-gray-600">Count</th>}
                        {includeCount && <th className="text-right px-3 py-2 font-medium text-gray-600">Denom.</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {points.slice(0, 20).map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-700 max-w-[160px] truncate">{p.AreaName}</td>
                          <td className="px-3 py-1.5 text-gray-500">{p.Period}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700">{p.Value ?? '–'}</td>
                          {includeCount && <td className="px-3 py-1.5 text-right text-gray-500">{p.Count ?? '–'}</td>}
                          {includeCount && <td className="px-3 py-1.5 text-right text-gray-500">{p.Denominator ?? '–'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {points.length > 20 && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                    …and {points.length - 20} more rows
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dataset name</label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#005EB8]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer — only shown on preview step */}
        {step === 'preview' && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!datasetName.trim()}
              className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium disabled:opacity-40 transition-colors"
            >
              Add dataset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
