'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChartConfig, Dataset } from '@/lib/dashboard/types';
import { extractTableData } from './ChartDataTable';
import { makeFilename, exportSvg, exportPng, copyAsPng, exportCsv, copyAsTable } from '@/lib/dashboard/exportChart';

interface TileExportMenuProps {
  chart: ChartConfig;
  datasets: Dataset[];
  dashboardTitle: string;
  contentRef: React.RefObject<HTMLDivElement>;
}

export default function TileExportMenu({ chart, datasets, dashboardTitle, contentRef }: TileExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getSvg = (): SVGSVGElement | null =>
    contentRef.current?.querySelector('svg') ?? null;

  const tableData = extractTableData(chart, datasets);
  const hasSvg = !!contentRef.current?.querySelector('svg');
  const hasCsv = !!tableData;

  const feedback = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const name = chart.name || 'Chart';
  const base = (ext: string) => makeFilename(name, dashboardTitle, ext);

  return (
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Export chart"
        className="p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-400 hover:text-gray-600 shadow-sm"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 text-xs">
          <p className="px-3 py-1.5 text-gray-400 font-medium uppercase tracking-wide text-[10px] border-b border-gray-100 mb-1">
            Export
          </p>

          {hasSvg && (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={async () => {
                  const svg = getSvg();
                  if (!svg) return;
                  try { await copyAsPng(svg); feedback('Copied!'); } catch { feedback('Failed'); }
                  setOpen(false);
                }}
              >
                <span className="text-gray-400">⊞</span>
                {copied === 'Copied!' ? <span className="text-green-600 font-medium">Copied!</span> : 'Copy as image (PNG)'}
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={async () => {
                  const svg = getSvg();
                  if (!svg) return;
                  await exportPng(svg, base('png'));
                  setOpen(false);
                }}
              >
                <span className="text-gray-400">↓</span> Download PNG
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={() => {
                  const svg = getSvg();
                  if (!svg) return;
                  exportSvg(svg, base('svg'));
                  setOpen(false);
                }}
              >
                <span className="text-gray-400">↓</span> Download SVG
              </button>
            </>
          )}

          {hasCsv && (
            <>
              {hasSvg && <div className="border-t border-gray-100 my-1" />}
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={() => {
                  if (!tableData) return;
                  exportCsv(tableData.headers, tableData.rows, base('csv'));
                  setOpen(false);
                }}
              >
                <span className="text-gray-400">↓</span> Download CSV
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={async () => {
                  if (!tableData) return;
                  try { await copyAsTable(tableData.headers, tableData.rows); feedback('Table copied!'); } catch { feedback('Failed'); }
                  setOpen(false);
                }}
              >
                <span className="text-gray-400">⊞</span>
                {copied === 'Table copied!' ? <span className="text-green-600 font-medium">Table copied!</span> : 'Copy data as table'}
              </button>
            </>
          )}

          {!hasSvg && !hasCsv && (
            <p className="px-3 py-2 text-gray-400 italic">No export available for this tile type.</p>
          )}
        </div>
      )}
    </div>
  );
}
