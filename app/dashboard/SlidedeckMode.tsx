'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  DashboardState, SlideDeck, Slide, SlideElement,
} from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';
import TileRenderer from './TileRenderer';

interface Props {
  state: DashboardState;
  onSaveDecks: (decks: SlideDeck[]) => void;
  onClose: () => void;
}

// ── svg → png helper ─────────────────────────────────────────────────────────

function svgElToBase64Png(svgEl: SVGSVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const rect = svgEl.getBoundingClientRect();
    const w = rect.width || Number(svgEl.getAttribute('width')) || 600;
    const h = rect.height || Number(svgEl.getAttribute('height')) || 400;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function emptySlide(): Slide {
  return { id: newId(), background: '', elements: [], notes: '' };
}

function emptyDeck(): SlideDeck {
  return { id: newId(), name: 'Untitled deck', slides: [emptySlide()] };
}

function defaultEl(type: SlideElement['type'], chartId = ''): SlideElement {
  return {
    id: newId(), type, chartId,
    text: type === 'text' ? 'Text' : '',
    x: type === 'text' ? 10 : 5,
    y: type === 'text' ? 38 : 8,
    w: type === 'text' ? 80 : 90,
    h: type === 'text' ? 24 : 84,
    fontSize: 28, fontWeight: 'normal',
    textAlign: 'center', textColor: '#0f172a', bgColor: '',
  };
}

// ── SlideElementView ──────────────────────────────────────────────────────────

interface ElViewProps {
  element: SlideElement;
  isSelected: boolean;
  state: DashboardState;
  presentMode?: boolean;
  onMouseDown: (e: React.MouseEvent, mode: 'move' | 'resize') => void;
  onTextChange: (t: string) => void;
}

function SlideElementView({ element: el, isSelected, state, presentMode, onMouseDown, onTextChange }: ElViewProps) {
  const [editing, setEditing] = useState(false);

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`, top: `${el.y}%`,
    width: `${el.w}%`, height: `${el.h}%`,
  };

  const ring = isSelected
    ? 'ring-2 ring-blue-500'
    : presentMode ? '' : 'hover:ring-1 hover:ring-slate-300';

  if (el.type === 'chart') {
    const chart = state.charts.find((c) => c.id === el.chartId);
    const syntheticTile = { id: el.id, chartId: el.chartId, x: 0, y: 0, w: 6, h: 4 };
    return (
      <div data-slide-el={el.id} style={posStyle} className={`overflow-hidden ${ring}`}>
        <div className="w-full h-full pointer-events-none overflow-hidden">
          {chart ? (
            <TileRenderer
              tile={syntheticTile}
              chart={chart}
              datasets={state.datasets}
              theme={state.dashboard.theme}
              ragRules={state.ragRules ?? []}
              annotations={state.annotations ?? []}
              dashboardTitle=""
              onEdit={() => {}}
              onDelete={() => {}}
              onDuplicate={() => {}}
              onDetails={() => {}}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
              Chart not found
            </div>
          )}
        </div>
        {!presentMode && (
          <div
            className="absolute inset-0 cursor-move"
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'move'); }}
          />
        )}
        {isSelected && !presentMode && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-slate-700 cursor-se-resize z-10"
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize'); }}
          />
        )}
      </div>
    );
  }

  // text element
  return (
    <div
      data-slide-el={el.id}
      style={{
        ...posStyle,
        background: el.bgColor || 'transparent',
        color: el.textColor,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        textAlign: el.textAlign,
        padding: '4px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: el.textAlign === 'right' ? 'flex-end' : el.textAlign === 'center' ? 'center' : 'flex-start',
      }}
      className={ring}
    >
      {editing && !presentMode ? (
        <textarea
          autoFocus
          className="w-full h-full resize-none bg-transparent outline-none border-none"
          style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', textAlign: 'inherit' }}
          value={el.text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <span className="w-full whitespace-pre-wrap break-words leading-snug">
          {el.text}
        </span>
      )}
      {!presentMode && (
        <div
          className="absolute inset-0 cursor-move"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'move'); }}
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        />
      )}
      {isSelected && !presentMode && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-slate-700 cursor-se-resize z-10"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize'); }}
        />
      )}
    </div>
  );
}

// ── PresentView ───────────────────────────────────────────────────────────────

function PresentView({ deck, state, startIdx, onClose }: {
  deck: SlideDeck; state: DashboardState; startIdx: number; onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [showNotes, setShowNotes] = useState(false);
  const slide = deck.slides[idx];
  const total = deck.slides.length;

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(total - 1, i + 1));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'n' || e.key === 'N') setShowNotes((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx, total]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col items-center justify-center select-none">
      {/* Exit */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
        aria-label="Exit presentation"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>

      {/* Slide */}
      <div
        style={{
          width: 'min(90vw, calc((90vh - 120px) * 16 / 9))',
          aspectRatio: '16 / 9',
          position: 'relative',
          background: slide.background || '#ffffff',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        {slide.elements.map((el) => (
          <SlideElementView
            key={el.id}
            element={el}
            isSelected={false}
            state={state}
            presentMode
            onMouseDown={() => {}}
            onTextChange={() => {}}
          />
        ))}
      </div>

      {/* Nav */}
      <div className="flex items-center gap-6 mt-6">
        <button type="button" onClick={prev} disabled={idx === 0}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors">
          ‹
        </button>
        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {deck.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-3 h-3 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
        <button type="button" onClick={next} disabled={idx === total - 1}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors">
          ›
        </button>
      </div>

      {/* Notes toggle */}
      {slide.notes && (
        <button type="button" onClick={() => setShowNotes((v) => !v)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {showNotes ? 'Hide notes' : 'Show notes (N)'}
        </button>
      )}
      {showNotes && slide.notes && (
        <div className="mt-2 max-w-2xl w-full px-4 text-sm text-slate-300 bg-white/5 rounded-xl p-3 text-center leading-relaxed">
          {slide.notes}
        </div>
      )}
    </div>
  );
}

// ── ChartPickerModal ──────────────────────────────────────────────────────────

function ChartPickerModal({ charts, onSelect, onClose }: {
  charts: DashboardState['charts']; onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-80 max-h-[70vh] flex flex-col overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Add chart to slide</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded">✕</button>
        </div>
        <div className="overflow-y-auto p-2">
          {charts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No charts in this dashboard yet.</p>
          ) : (
            charts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onSelect(c.id); onClose(); }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <span className="text-xs font-mono text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{c.type}</span>
                <span className="text-sm text-slate-700 truncate">{c.name || c.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type DragState = {
  elementId: string; mode: 'move' | 'resize';
  startClientX: number; startClientY: number;
  origX: number; origY: number; origW: number; origH: number;
};

const BG_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Light', value: '#f8fafc' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Dark', value: '#0f172a' },
];

export default function SlidedeckMode({ state, onSaveDecks, onClose }: Props) {
  const [localDecks, setLocalDecks] = useState<SlideDeck[]>(() =>
    state.slideDecks && state.slideDecks.length ? [...state.slideDecks] : [emptyDeck()],
  );
  const [activeDeckIdx, setActiveDeckIdx] = useState(0);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showPresent, setShowPresent] = useState(false);
  const [showChartPicker, setShowChartPicker] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const activeDeckIdxRef = useRef(activeDeckIdx);
  activeDeckIdxRef.current = activeDeckIdx;
  const activeSlideIdxRef = useRef(activeSlideIdx);
  activeSlideIdxRef.current = activeSlideIdx;

  const activeDeck = localDecks[activeDeckIdx];
  const activeSlide = activeDeck?.slides[activeSlideIdx];
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedElementId) ?? null;

  // ── mutations ───────────────────────────────────────────────────────────────

  const patchDecks = (fn: (d: SlideDeck[]) => SlideDeck[]) => setLocalDecks((prev) => fn(prev));

  const patchSlide = (patch: Partial<Slide>) =>
    patchDecks((decks) =>
      decks.map((d, di) => di !== activeDeckIdxRef.current ? d : {
        ...d,
        slides: d.slides.map((s, si) => si !== activeSlideIdxRef.current ? s : { ...s, ...patch }),
      }),
    );

  const patchElement = (elementId: string, patch: Partial<SlideElement>) =>
    patchDecks((decks) =>
      decks.map((d, di) => di !== activeDeckIdxRef.current ? d : {
        ...d,
        slides: d.slides.map((s, si) => si !== activeSlideIdxRef.current ? s : {
          ...s,
          elements: s.elements.map((el) => el.id === elementId ? { ...el, ...patch } : el),
        }),
      }),
    );

  const addChartElement = (chartId: string) => {
    const el = defaultEl('chart', chartId);
    patchSlide({ elements: [...(activeSlide?.elements ?? []), el] });
    setSelectedElementId(el.id);
  };

  const addTextElement = () => {
    const el = defaultEl('text');
    patchSlide({ elements: [...(activeSlide?.elements ?? []), el] });
    setSelectedElementId(el.id);
  };

  const deleteElement = (elementId: string) => {
    patchSlide({ elements: activeSlide?.elements.filter((e) => e.id !== elementId) ?? [] });
    setSelectedElementId(null);
  };

  const addSlide = () => {
    const slide = emptySlide();
    patchDecks((decks) =>
      decks.map((d, di) => di !== activeDeckIdx ? d : {
        ...d,
        slides: [...d.slides, slide],
      }),
    );
    setActiveSlideIdx(activeDeck.slides.length);
    setSelectedElementId(null);
  };

  const duplicateSlide = () => {
    if (!activeSlide) return;
    const copy: Slide = {
      ...activeSlide,
      id: newId(),
      elements: activeSlide.elements.map((el) => ({ ...el, id: newId() })),
    };
    const newIdx = activeSlideIdx + 1;
    patchDecks((decks) =>
      decks.map((d, di) => di !== activeDeckIdx ? d : {
        ...d,
        slides: [...d.slides.slice(0, newIdx), copy, ...d.slides.slice(newIdx)],
      }),
    );
    setActiveSlideIdx(newIdx);
    setSelectedElementId(null);
  };

  const deleteSlide = () => {
    if (!activeDeck || activeDeck.slides.length <= 1) return;
    patchDecks((decks) =>
      decks.map((d, di) => di !== activeDeckIdx ? d : {
        ...d,
        slides: d.slides.filter((_, si) => si !== activeSlideIdx),
      }),
    );
    setActiveSlideIdx((i) => Math.max(0, i - 1));
    setSelectedElementId(null);
  };

  const addDeck = () => {
    const deck = emptyDeck();
    patchDecks((prev) => [...prev, deck]);
    setActiveDeckIdx(localDecks.length);
    setActiveSlideIdx(0);
    setSelectedElementId(null);
  };

  // ── drag ────────────────────────────────────────────────────────────────────

  const handleElementMouseDown = (
    e: React.MouseEvent, elementId: string, mode: 'move' | 'resize',
  ) => {
    e.preventDefault();
    const el = activeSlide?.elements.find((el) => el.id === elementId);
    if (!el) return;
    setSelectedElementId(elementId);
    dragRef.current = {
      elementId, mode,
      startClientX: e.clientX, startClientY: e.clientY,
      origX: el.x, origY: el.y, origW: el.w, origH: el.h,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - d.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - d.startClientY) / rect.height) * 100;
      patchElement(d.elementId,
        d.mode === 'move'
          ? { x: Math.max(0, Math.min(95, d.origX + dxPct)), y: Math.max(0, Math.min(95, d.origY + dyPct)) }
          : { w: Math.max(5, Math.min(100, d.origW + dxPct)), h: Math.max(5, Math.min(100, d.origH + dyPct)) },
      );
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // stable — reads through refs

  // ── keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') setSelectedElementId(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement(selectedElementId);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedElementId]);

  // ── pptx export ─────────────────────────────────────────────────────────────

  const exportAsPptx = async () => {
    if (!activeDeck || exporting) return;
    setExporting(true);
    const originalIdx = activeSlideIdx;

    try {
      const pptxgenjs = (await import('pptxgenjs')).default;
      const pptx = new pptxgenjs();
      pptx.layout = 'LAYOUT_16x9'; // 10" × 5.625"
      const SW = 10;   // slide width in inches
      const SH = 5.625; // slide height in inches

      for (let si = 0; si < activeDeck.slides.length; si++) {
        setActiveSlideIdx(si);
        // Give React + D3 time to render the slide
        await new Promise((r) => setTimeout(r, 300));

        const slide = activeDeck.slides[si];
        const pSlide = pptx.addSlide();
        if (slide.background) {
          pSlide.background = { fill: slide.background.replace('#', '') };
        }

        for (const el of slide.elements) {
          const x = (el.x / 100) * SW;
          const y = (el.y / 100) * SH;
          const w = (el.w / 100) * SW;
          const h = (el.h / 100) * SH;

          if (el.type === 'text') {
            const ptSize = Math.max(8, Math.round(el.fontSize * 0.75));
            pSlide.addText(el.text || '', {
              x, y, w, h,
              fontSize: ptSize,
              bold: el.fontWeight === 'bold',
              align: el.textAlign as 'left' | 'center' | 'right',
              color: (el.textColor || '#000000').replace('#', ''),
              fill: el.bgColor ? { color: el.bgColor.replace('#', '') } : { type: 'none' },
              wrap: true,
              valign: 'middle',
            });
          } else if (el.type === 'chart') {
            const elContainer = canvasRef.current?.querySelector(`[data-slide-el="${el.id}"]`);
            const svgEl = elContainer?.querySelector('svg') as SVGSVGElement | null;
            if (svgEl) {
              const dataUrl = await svgElToBase64Png(svgEl);
              pSlide.addImage({ data: dataUrl, x, y, w, h });
            } else {
              // Fallback for chart types that render as HTML (KPI, text, table)
              const chart = state.charts.find((c) => c.id === el.chartId);
              pSlide.addText(chart?.name || 'Chart', {
                x, y, w, h, fontSize: 14, align: 'center', color: '64748b',
                fill: { color: 'f1f5f9' }, valign: 'middle',
              });
            }
          }
        }
      }

      const deckName = (activeDeck.name || 'presentation').replace(/[/\\?%*:|"<>]/g, '-');
      await pptx.writeFile({ fileName: `${deckName}.pptx` });
    } catch {
      window.alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setActiveSlideIdx(originalIdx);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-hidden">

      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center gap-4 flex-shrink-0 z-10">
        {/* Deck picker */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded flex-shrink-0"
            aria-label="Close slide deck editor">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <select
            value={activeDeckIdx}
            onChange={(e) => { setActiveDeckIdx(Number(e.target.value)); setActiveSlideIdx(0); setSelectedElementId(null); }}
            className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 max-w-[180px] truncate"
          >
            {localDecks.map((d, i) => (
              <option key={d.id} value={i}>{d.name}</option>
            ))}
          </select>
          <button type="button" onClick={addDeck}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition-colors flex-shrink-0">
            + New deck
          </button>
          {activeDeck && (
            <input
              value={activeDeck.name}
              onChange={(e) => patchDecks((d) => d.map((dk, i) => i === activeDeckIdx ? { ...dk, name: e.target.value } : dk))}
              className="text-sm text-slate-500 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 max-w-[160px] truncate"
              placeholder="Deck title"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowPresent(true)}
            disabled={!activeDeck || activeDeck.slides.length === 0}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M4 3l9 5-9 5V3z" />
            </svg>
            Present
          </button>
          <button
            type="button"
            onClick={exportAsPptx}
            disabled={!activeDeck || activeDeck.slides.length === 0 || exporting}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-colors"
            title="Export as PowerPoint (.pptx)"
          >
            {exporting ? (
              <>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 animate-spin">
                  <circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="8" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70">
                  <path d="M8 1v8M5 6l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export .pptx
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { onSaveDecks(localDecks); onClose(); }}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">

        {/* Left: slide thumbnails */}
        <aside className="w-44 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-2 space-y-1.5">
            {activeDeck?.slides.map((slide, si) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => { setActiveSlideIdx(si); setSelectedElementId(null); }}
                className={`w-full rounded-lg overflow-hidden border transition-all ${
                  si === activeSlideIdx ? 'border-slate-700 ring-1 ring-slate-500/30' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* 16:9 thumbnail */}
                <div style={{ aspectRatio: '16/9', background: slide.background || '#ffffff', position: 'relative' }}
                  className="flex items-center justify-center">
                  {slide.elements.length === 0 && (
                    <span className="text-[8px] text-slate-300">Empty</span>
                  )}
                  {slide.elements.length > 0 && (
                    <span className="text-[8px] text-slate-400">{slide.elements.length} element{slide.elements.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="px-2 py-1 text-left">
                  <span className="text-[10px] text-slate-500 font-medium">Slide {si + 1}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="p-2 mt-auto border-t border-slate-100 space-y-1">
            <button type="button" onClick={addSlide}
              className="w-full text-xs text-slate-600 hover:bg-slate-50 py-1.5 rounded-lg transition-colors text-center font-medium">
              + Add slide
            </button>
            <button type="button" onClick={duplicateSlide}
              className="w-full text-xs text-slate-500 hover:bg-slate-50 py-1.5 rounded-lg transition-colors text-center">
              Duplicate
            </button>
            {activeDeck && activeDeck.slides.length > 1 && (
              <button type="button" onClick={deleteSlide}
                className="w-full text-xs text-red-400 hover:bg-red-50 py-1.5 rounded-lg transition-colors text-center">
                Delete slide
              </button>
            )}
          </div>
        </aside>

        {/* Center: canvas */}
        <div className="flex-1 flex flex-col items-center justify-start pt-6 px-8 pb-6 overflow-auto">
          {/* Canvas toolbar */}
          <div className="flex items-center gap-2 mb-4 self-start">
            <button type="button" onClick={() => setShowChartPicker(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70"><path d="M1 13h3V7H1zm4 0h3V4H5zm4 0h3V1H9z"/></svg>
              Add chart
            </button>
            <button type="button" onClick={addTextElement}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 opacity-70"><path d="M2 4h12v1.5H9.5V12h-3V5.5H2z"/></svg>
              Add text
            </button>
            {selectedElement && (
              <button type="button" onClick={() => deleteElement(selectedElementId!)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                Delete element
              </button>
            )}
            <span className="text-xs text-slate-400 ml-2">
              Click text to edit · Drag to move · Drag corner to resize
            </span>
          </div>

          {/* Canvas with rulers */}
          <div style={{ maxWidth: '760px', width: '100%' }}>
            {/* X ruler */}
            <div style={{ marginLeft: '20px', position: 'relative', height: '18px', userSelect: 'none' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: '#e2e8f0' }} />
              {[0,10,20,30,40,50,60,70,80,90,100].map((p) => (
                <div key={p} style={{ position: 'absolute', left: `${p}%`, transform: 'translateX(-50%)', bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {[0,25,50,75,100].includes(p) && (
                    <span style={{ fontSize: '7px', color: '#94a3b8', lineHeight: 1, marginBottom: '2px' }}>{p}</span>
                  )}
                  <div style={{ width: '1px', height: [0,25,50,75,100].includes(p) ? '5px' : '3px', background: '#cbd5e1' }} />
                </div>
              ))}
            </div>
            {/* Y ruler + canvas row */}
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Y ruler */}
              <div style={{ width: '20px', position: 'relative', flexShrink: 0, userSelect: 'none' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px', background: '#e2e8f0' }} />
                {[0,10,20,30,40,50,60,70,80,90,100].map((p) => (
                  <div key={p} style={{ position: 'absolute', top: `${p}%`, transform: 'translateY(-50%)', right: 0, display: 'flex', alignItems: 'center' }}>
                    {[0,25,50,75,100].includes(p) && (
                      <span style={{ fontSize: '7px', color: '#94a3b8', lineHeight: 1, marginRight: '2px' }}>{p}</span>
                    )}
                    <div style={{ height: '1px', width: [0,25,50,75,100].includes(p) ? '5px' : '3px', background: '#cbd5e1' }} />
                  </div>
                ))}
              </div>
              {/* Canvas */}
              <div
                ref={canvasRef}
                style={{
                  flex: 1,
                  minWidth: 0,
                  aspectRatio: '16 / 9',
                  position: 'relative',
                  background: activeSlide?.background || '#ffffff',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                }}
                onClick={() => setSelectedElementId(null)}
              >
                {activeSlide?.elements.map((el) => (
                  <SlideElementView
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedElementId}
                    state={state}
                    onMouseDown={(e, mode) => handleElementMouseDown(e, el.id, mode)}
                    onTextChange={(text) => patchElement(el.id, { text })}
                  />
                ))}
                {activeSlide?.elements.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 select-none pointer-events-none gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-50">
                      <rect x="3" y="3" width="18" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                    </svg>
                    <span className="text-sm">Add a chart or text block above</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: properties */}
        <aside className="w-56 bg-white border-l border-slate-200 p-4 flex-shrink-0 overflow-y-auto">
          {selectedElement ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {selectedElement.type === 'chart' ? 'Chart element' : 'Text element'}
              </p>

              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size (px)</label>
                    <input type="number" value={selectedElement.fontSize} min={8} max={120}
                      onChange={(e) => patchElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Text colour</label>
                    <input type="color" value={selectedElement.textColor}
                      onChange={(e) => patchElement(selectedElement.id, { textColor: e.target.value })}
                      className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Background</label>
                    <input type="color" value={selectedElement.bgColor || '#ffffff'}
                      onChange={(e) => patchElement(selectedElement.id, { bgColor: e.target.value })}
                      className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                    <button type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => patchElement(selectedElement.id, { bgColor: '' })}
                      className="mt-1 text-[10px] text-slate-400 hover:text-slate-600">
                      Clear (transparent)
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Style</label>
                    <div className="flex gap-1">
                      <button type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => patchElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`flex-1 text-xs py-1 rounded border transition-colors font-bold ${selectedElement.fontWeight === 'bold' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        B
                      </button>
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => patchElement(selectedElement.id, { textAlign: a })}
                          className={`flex-1 text-xs py-1 rounded border transition-colors ${selectedElement.textAlign === a ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          {a === 'left' ? '⬅' : a === 'center' ? '⬛' : '➡'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedElement.type === 'chart' && (
                <p className="text-xs text-slate-500">
                  Showing: <span className="font-medium text-slate-700">
                    {state.charts.find((c) => c.id === selectedElement.chartId)?.name ?? 'Unknown chart'}
                  </span>
                </p>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">Position &amp; size (% of slide)</p>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <div key={k}>
                      <label className="text-[10px] text-slate-400 uppercase">{k}</label>
                      <input type="number" value={Math.round(selectedElement[k])} min={0} max={100}
                        onChange={(e) => patchElement(selectedElement.id, { [k]: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slide</p>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Background</label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {BG_PRESETS.map((p) => (
                    <button key={p.value} type="button"
                      onClick={() => patchSlide({ background: p.value })}
                      className={`text-xs py-1.5 rounded-lg border transition-colors ${(activeSlide?.background || '#ffffff') === p.value ? 'ring-2 ring-slate-700 border-slate-600' : 'border-slate-200 hover:border-slate-300'}`}
                      style={{ background: p.value, color: p.value === '#1e3a5f' || p.value === '#0f172a' ? '#fff' : '#0f172a' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input type="color" value={activeSlide?.background || '#ffffff'}
                  onChange={(e) => patchSlide({ background: e.target.value })}
                  className="w-full h-7 rounded border border-slate-200 cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Speaker notes</label>
                <textarea
                  rows={5}
                  value={activeSlide?.notes || ''}
                  onChange={(e) => patchSlide({ notes: e.target.value })}
                  placeholder="Speaker notes"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400/30 placeholder:text-slate-300"
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals */}
      {showChartPicker && (
        <ChartPickerModal
          charts={state.charts}
          onSelect={addChartElement}
          onClose={() => setShowChartPicker(false)}
        />
      )}

      {showPresent && activeDeck && (
        <PresentView
          deck={activeDeck}
          state={state}
          startIdx={activeSlideIdx}
          onClose={() => setShowPresent(false)}
        />
      )}
    </div>
  );
}
