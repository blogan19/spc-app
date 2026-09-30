'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardState, StoryDef, StoryStep, DashboardTile } from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';
import TileRenderer from './TileRenderer';

interface PresentationModeProps {
  state: DashboardState;
  onSaveStories: (stories: StoryDef[]) => void;
  onClose: () => void;
}

function emptyStep(tileId: string): StoryStep {
  return { id: newId(), focusTileId: tileId, commentary: '', duration: 0 };
}

function emptyStory(tiles: DashboardTile[]): StoryDef {
  return {
    id: newId(),
    name: 'New presentation',
    steps: tiles.slice(0, 1).map((t) => emptyStep(t.id)),
  };
}

// ─── Story Editor ───────────────────────────────────────────────────────────

function StoryEditor({
  story,
  tiles,
  onChange,
}: {
  story: StoryDef;
  tiles: DashboardTile[];
  onChange: (s: StoryDef) => void;
}) {
  const set = (patch: Partial<StoryDef>) => onChange({ ...story, ...patch });

  const setStep = (id: string, patch: Partial<StoryStep>) =>
    set({ steps: story.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const addStep = () =>
    set({ steps: [...story.steps, emptyStep(tiles[0]?.id ?? '')] });

  const removeStep = (id: string) =>
    set({ steps: story.steps.filter((s) => s.id !== id) });

  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = story.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const next = [...story.steps];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    set({ steps: next });
  };

  const tileLabel = (tileId: string) => {
    const t = tiles.find((t) => t.id === tileId);
    return t ? `Tile ${tiles.indexOf(t) + 1}` : 'Unknown tile';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Story name */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <input
          value={story.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full text-sm font-semibold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="Presentation name"
        />
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {story.steps.map((step, i) => (
          <div key={step.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                {i + 1}
              </span>
              <select
                value={step.focusTileId}
                onChange={(e) => setStep(step.id, { focusTileId: e.target.value })}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {tiles.map((t, ti) => (
                  <option key={t.id} value={t.id}>
                    Tile {ti + 1}{' '}
                    {/* show chart name if available */}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 flex-shrink-0">
                <button type="button" onClick={() => moveStep(step.id, -1)} disabled={i === 0}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30 px-1">↑</button>
                <button type="button" onClick={() => moveStep(step.id, 1)} disabled={i === story.steps.length - 1}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30 px-1">↓</button>
                <button type="button" onClick={() => removeStep(step.id)}
                  className="text-slate-300 hover:text-red-500 px-1">✕</button>
              </div>
            </div>
            <textarea
              value={step.commentary}
              onChange={(e) => setStep(step.id, { commentary: e.target.value })}
              placeholder="Commentary for this step (shown during presentation)…"
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 placeholder:text-slate-300"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Auto-advance after</label>
              <input
                type="number"
                min={0}
                value={step.duration}
                onChange={(e) => setStep(step.id, { duration: Math.max(0, Number(e.target.value)) })}
                className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">s (0 = manual)</span>
            </div>
          </div>
        ))}

        <button type="button" onClick={addStep}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 text-xs font-medium transition-colors">
          + Add step
        </button>
      </div>
    </div>
  );
}

// ─── Presentation View ───────────────────────────────────────────────────────

function PresentView({
  state,
  story,
  onExit,
}: {
  state: DashboardState;
  story: StoryDef;
  onExit: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [showCommentary, setShowCommentary] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = story.steps[stepIdx];
  const focusId = step?.focusTileId;

  const go = useCallback((delta: number) => {
    setStepIdx((i) => {
      const next = i + delta;
      if (next < 0 || next >= story.steps.length) return i;
      return next;
    });
  }, [story.steps.length]);

  // Auto-advance
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (step?.duration > 0) {
      timerRef.current = setTimeout(() => go(1), step.duration * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stepIdx, step, go]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, onExit]);

  const tiles = state.dashboard.tiles;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <span className="text-white font-semibold text-sm truncate">{story.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">
            {stepIdx + 1} / {story.steps.length}
          </span>
          <button type="button" onClick={() => setShowCommentary((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
            {showCommentary ? 'Hide notes' : 'Show notes'}
          </button>
          <button type="button" onClick={onExit}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Dashboard canvas */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-800 p-4 relative">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: '80px',
          }}
        >
          {tiles.map((tile) => {
            const chart = state.charts.find((c) => c.id === tile.chartId);
            if (!chart) return null;
            const isFocused = tile.id === focusId;
            return (
              <div
                key={tile.id}
                style={{
                  gridColumn: `${tile.x + 1} / span ${tile.w}`,
                  gridRow: `${tile.y + 1} / span ${tile.h}`,
                  opacity: focusId ? (isFocused ? 1 : 0.2) : 1,
                  transform: isFocused ? 'scale(1.01)' : 'scale(1)',
                  transition: 'opacity 0.4s ease, transform 0.3s ease',
                  zIndex: isFocused ? 10 : 1,
                }}
                className="bg-white rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200/50"
              >
                <TileRenderer
                  tile={tile}
                  chart={chart}
                  datasets={state.datasets}
                  theme={state.dashboard.theme}
                  ragRules={state.ragRules ?? []}
                  annotations={state.annotations ?? []}
                  dashboardTitle={state.dashboard.title}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  onDetails={() => {}}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Commentary + navigation */}
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800">
        {showCommentary && step?.commentary && (
          <div className="px-6 py-3 bg-slate-800 border-b border-slate-700">
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{step.commentary}</p>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-3">
          <button type="button" onClick={() => go(-1)} disabled={stepIdx === 0}
            className="text-sm px-4 py-2 rounded-lg bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600 transition-colors">
            ← Back
          </button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {story.steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === stepIdx ? 'bg-white scale-125' : 'bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button type="button" onClick={() => go(1)} disabled={stepIdx === story.steps.length - 1}
            className="text-sm px-4 py-2 rounded-lg bg-slate-700 text-slate-200 disabled:opacity-30 hover:bg-slate-600 transition-colors">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PresentationMode({ state, onSaveStories, onClose }: PresentationModeProps) {
  const stories = state.stories ?? [];
  const tiles = state.dashboard.tiles;

  const [selectedId, setSelectedId] = useState<string>(stories[0]?.id ?? '');
  const [localStories, setLocalStories] = useState<StoryDef[]>(
    stories.length > 0 ? stories : tiles.length > 0 ? [emptyStory(tiles)] : [],
  );
  const [presenting, setPresenting] = useState(false);

  const selectedStory = localStories.find((s) => s.id === selectedId) ?? localStories[0];

  const updateStory = (updated: StoryDef) =>
    setLocalStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const addStory = () => {
    const s = emptyStory(tiles);
    setLocalStories((prev) => [...prev, s]);
    setSelectedId(s.id);
  };

  const deleteStory = (id: string) => {
    if (!window.confirm('Delete this presentation?')) return;
    const remaining = localStories.filter((s) => s.id !== id);
    setLocalStories(remaining);
    setSelectedId(remaining[0]?.id ?? '');
  };

  const save = () => {
    onSaveStories(localStories);
    onClose();
  };

  if (presenting && selectedStory) {
    return (
      <PresentView
        state={state}
        story={selectedStory}
        onExit={() => setPresenting(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white flex flex-col shadow-2xl z-10 w-full max-w-3xl mx-auto my-8 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Presentation Mode</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Build a scripted walkthrough — each step focuses on one tile with commentary.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar: story list */}
          <div className="w-48 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
            <div className="p-3 flex-1 overflow-y-auto space-y-1">
              {localStories.map((s) => (
                <div key={s.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      s.id === selectedId
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="block truncate">{s.name || 'Untitled'}</span>
                    <span className={`text-[10px] ${s.id === selectedId ? 'text-blue-200' : 'text-slate-400'}`}>
                      {s.steps.length} step{s.steps.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {s.id === selectedId && (
                    <button
                      type="button"
                      onClick={() => deleteStory(s.id)}
                      className="absolute right-2 top-2 text-blue-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-200">
              <button type="button" onClick={addStory}
                className="w-full text-xs py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                + New presentation
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-w-0 flex flex-col">
            {tiles.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-8 text-center">
                Add some tiles to the dashboard before building a presentation.
              </div>
            ) : selectedStory ? (
              <StoryEditor
                story={selectedStory}
                tiles={tiles}
                onChange={updateStory}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select or create a presentation.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <button type="button" onClick={onClose}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selectedStory || selectedStory.steps.length === 0 || tiles.length === 0}
              onClick={() => setPresenting(true)}
              className="text-sm px-5 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ▶ Present
            </button>
            <button type="button" onClick={save}
              className="text-sm px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
              Save &amp; close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
