'use client';

import { useState } from 'react';
import { NHS_BENCHMARKS } from '@/lib/dashboard/benchmarks';
import type { ReferenceLine } from '@/lib/dashboard/types';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ReferenceLinesProps {
  lines: ReferenceLine[];
  onChange: (lines: ReferenceLine[]) => void;
}

export default function ReferenceLinesPanel({ lines, onChange }: ReferenceLinesProps) {
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customColor, setCustomColor] = useState('#d5281b');

  const addBenchmark = (bm: typeof NHS_BENCHMARKS[number]) => {
    if (lines.some((l) => l.label === bm.name)) return; // already added
    onChange([...lines, { id: newId(), value: bm.value, label: bm.name, source: bm.source, color: bm.color }]);
  };

  const addCustom = () => {
    const val = parseFloat(customValue);
    if (!isFinite(val) || !customLabel.trim()) return;
    onChange([...lines, { id: newId(), value: val, label: customLabel.trim(), source: 'Custom', color: customColor }]);
    setCustomValue('');
    setCustomLabel('');
  };

  const removeLine = (id: string) => onChange(lines.filter((l) => l.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">Reference lines</label>
        <button
          type="button"
          onClick={() => setShowBenchmarks((v) => !v)}
          className="text-xs text-[#005EB8] hover:underline"
        >
          {showBenchmarks ? 'Hide NHS benchmarks' : '+ NHS benchmarks'}
        </button>
      </div>

      {/* NHS benchmark picker */}
      {showBenchmarks && (
        <div className="border border-blue-100 rounded-lg bg-blue-50/40 p-2 space-y-1">
          <p className="text-xs text-gray-500 mb-1.5">Click to add a benchmark line:</p>
          {NHS_BENCHMARKS.map((bm) => {
            const added = lines.some((l) => l.label === bm.name);
            return (
              <button
                key={bm.id}
                type="button"
                disabled={added}
                onClick={() => addBenchmark(bm)}
                className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors
                  ${added ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-white hover:shadow-sm cursor-pointer'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bm.color }} />
                <span className="font-medium text-gray-800">{bm.name}</span>
                <span className="ml-auto text-gray-400 font-mono">{bm.value}{bm.unit}</span>
                {added && <span className="text-gray-400 ml-1">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Active lines */}
      {lines.length > 0 && (
        <div className="space-y-1.5">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: line.color }} />
              <span className="font-medium text-gray-800 truncate flex-1">{line.label}</span>
              <span className="text-gray-400 font-mono flex-shrink-0">{line.value}</span>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                aria-label={`Remove ${line.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom line form */}
      <details className="group">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Add custom reference line
        </summary>
        <div className="mt-2 space-y-2 pl-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Value</label>
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 95"
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Colour</label>
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-full h-8 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Internal target"
              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addCustom}
            disabled={!customLabel.trim() || !isFinite(parseFloat(customValue))}
            className="w-full text-xs py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add line
          </button>
        </div>
      </details>
    </div>
  );
}
