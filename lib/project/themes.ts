// Appearance themes — localStorage-backed save/load. A theme is a named
// snapshot of visual ChartSettings minus the per-measure content (title,
// axis labels). Pure helpers — the localStorage interaction is injected
// so the module is testable in node.

import type { ChartSettings } from './types';

const STORAGE_KEY = 'spc-themes-v1';

// Fields that vary with the measure's content and shouldn't be saved
// alongside reusable visual styling.
const PER_MEASURE_FIELDS = ['title', 'xAxisLabel', 'yAxisLabel'] as const;
type PerMeasureField = (typeof PER_MEASURE_FIELDS)[number];

export type ThemeSettings = Omit<ChartSettings, PerMeasureField>;

export interface Theme {
  name: string;
  settings: ThemeSettings;
}

interface ThemeStore {
  themes: Theme[];
}

// --- pure helpers ---------------------------------------------------------

export function toThemeSettings(settings: ChartSettings): ThemeSettings {
  const out = { ...settings } as Partial<ChartSettings>;
  for (const f of PER_MEASURE_FIELDS) delete out[f];
  return out as ThemeSettings;
}

export function applyTheme(
  current: ChartSettings,
  theme: Theme,
): ChartSettings {
  return { ...current, ...theme.settings };
}

// Curated palettes. Each row maps to:
//   [background, data line, centre, limits, default point, success, outlier]
// Backgrounds are kept light so the un-styled axis/title text (default
// black SVG fill) stays legible across every preset.
const RANDOM_PALETTES: ReadonlyArray<readonly string[]> = [
  // [bg, line, centre, limits, point, success, outlier]
  ['#ffffff', '#0ea5e9', '#0f172a', '#94a3b8', '#0ea5e9', '#10b981', '#ef4444'], // sky on white
  ['#f8fafc', '#7c3aed', '#1f2937', '#a3a3a3', '#7c3aed', '#22c55e', '#dc2626'], // violet on slate-50
  ['#fefce8', '#0d9488', '#111827', '#9ca3af', '#0d9488', '#65a30d', '#e11d48'], // teal on cream
  ['#fff7ed', '#ea580c', '#1c1917', '#a8a29e', '#ea580c', '#16a34a', '#b91c1c'], // amber on warm
  ['#eff6ff', '#1d4ed8', '#0f172a', '#64748b', '#1d4ed8', '#15803d', '#dc2626'], // royal on ice
  ['#fdf2f8', '#db2777', '#1f2937', '#9ca3af', '#db2777', '#16a34a', '#ea580c'], // pink on blush
  ['#f0fdf4', '#16a34a', '#052e16', '#86efac', '#16a34a', '#0ea5e9', '#dc2626'], // green on mint
  ['#f5f3ff', '#9333ea', '#1e1b4b', '#c4b5fd', '#9333ea', '#22c55e', '#ef4444'], // grape on lilac
  ['#fafaf9', '#334155', '#020617', '#cbd5e1', '#334155', '#10b981', '#dc2626'], // mono / accents
];

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

const pickInt = (rand: () => number, lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

/**
 * Build a pseudo-random theme. Pure: takes a random source so tests can
 * pin the picked palette. Leaves dimensions, margins, content (title /
 * labels) and toggle flags untouched — this only randomises the visual
 * styling (palette + background + stroke widths).
 */
export function randomTheme(
  current: ChartSettings,
  rand: () => number = Math.random,
): Partial<ChartSettings> {
  const palette = RANDOM_PALETTES[Math.floor(rand() * RANDOM_PALETTES.length)];
  const [bg, line, centre, limits, point, success, outlier] = palette;
  // Reasonable stroke ranges — data line a touch thicker than the
  // reference lines so it stays the focal element. Clamped to the
  // AppearanceForm's allowed range (1..5).
  const lineWidth = clamp(pickInt(rand, 2, 3), 1, 5);
  const medianWidth = clamp(pickInt(rand, 1, 3), 1, 5);
  const confWidth = clamp(pickInt(rand, 1, 3), 1, 5);
  // Squelch unused-var warning while keeping the destructure readable.
  void current;
  return {
    backgroundColor: bg,
    lineColor: line,
    medianColor: centre,
    confColor: limits,
    defaultPointColor: point,
    successColor: success,
    outlierColor: outlier,
    lineWidth,
    medianWidth,
    confWidth,
  };
}

export function addOrReplaceTheme(themes: Theme[], theme: Theme): Theme[] {
  const idx = themes.findIndex((t) => t.name === theme.name);
  if (idx === -1) return [...themes, theme];
  const next = themes.slice();
  next[idx] = theme;
  return next;
}

export function removeTheme(themes: Theme[], name: string): Theme[] {
  return themes.filter((t) => t.name !== name);
}

// --- storage layer --------------------------------------------------------

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function readStore(storage: Storage): ThemeStore {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { themes: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.themes)) return parsed as ThemeStore;
  } catch {
    // fall through to empty store on parse failure
  }
  return { themes: [] };
}

function writeStore(storage: Storage, store: ThemeStore): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function listThemes(storage?: Storage): Theme[] {
  const s = storage ?? getStorage();
  if (!s) return [];
  return readStore(s).themes;
}

export function saveTheme(name: string, settings: ChartSettings, storage?: Storage): Theme[] {
  const s = storage ?? getStorage();
  if (!s) return [];
  const theme: Theme = { name, settings: toThemeSettings(settings) };
  const next = addOrReplaceTheme(readStore(s).themes, theme);
  writeStore(s, { themes: next });
  return next;
}

export function deleteTheme(name: string, storage?: Storage): Theme[] {
  const s = storage ?? getStorage();
  if (!s) return [];
  const next = removeTheme(readStore(s).themes, name);
  writeStore(s, { themes: next });
  return next;
}
