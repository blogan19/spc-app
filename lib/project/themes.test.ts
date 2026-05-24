import { describe, expect, it } from 'vitest';
import {
  addOrReplaceTheme,
  applyTheme,
  deleteTheme,
  listThemes,
  removeTheme,
  saveTheme,
  toThemeSettings,
  type Theme,
} from './themes';
import { defaultChartSettings } from './seed';

// In-memory Storage stub so tests don't depend on a browser.
function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _peek: () => map,
  };
}

describe('toThemeSettings', () => {
  it('strips per-measure content fields', () => {
    const t = toThemeSettings({
      ...defaultChartSettings,
      title: 'Mortality',
      xAxisLabel: 'Month',
      yAxisLabel: 'Deaths',
    });
    expect('title' in t).toBe(false);
    expect('xAxisLabel' in t).toBe(false);
    expect('yAxisLabel' in t).toBe(false);
    expect(t.lineColor).toBe(defaultChartSettings.lineColor);
  });
});

describe('applyTheme', () => {
  it('overlays the theme onto current settings without touching content', () => {
    const current = { ...defaultChartSettings, title: 'Mortality', lineColor: '#ff0000' };
    const theme: Theme = {
      name: 'Dark',
      settings: toThemeSettings({ ...defaultChartSettings, lineColor: '#000000' }),
    };
    const applied = applyTheme(current, theme);
    expect(applied.lineColor).toBe('#000000');
    expect(applied.title).toBe('Mortality'); // unchanged
  });
});

describe('addOrReplaceTheme / removeTheme', () => {
  it('appends a new theme', () => {
    const next = addOrReplaceTheme([], {
      name: 'A',
      settings: toThemeSettings(defaultChartSettings),
    });
    expect(next).toHaveLength(1);
  });

  it('overwrites a theme of the same name', () => {
    const a: Theme = { name: 'A', settings: toThemeSettings(defaultChartSettings) };
    const a2: Theme = {
      name: 'A',
      settings: toThemeSettings({ ...defaultChartSettings, lineColor: '#222222' }),
    };
    const next = addOrReplaceTheme([a], a2);
    expect(next).toHaveLength(1);
    expect(next[0].settings.lineColor).toBe('#222222');
  });

  it('removes by name', () => {
    const themes: Theme[] = [
      { name: 'A', settings: toThemeSettings(defaultChartSettings) },
      { name: 'B', settings: toThemeSettings(defaultChartSettings) },
    ];
    expect(removeTheme(themes, 'A').map((t) => t.name)).toEqual(['B']);
  });
});

describe('storage round-trip', () => {
  it('saves and lists themes via an injected storage', () => {
    const s = makeStorage();
    saveTheme('Board pack', defaultChartSettings, s);
    saveTheme('Compact', { ...defaultChartSettings, height: 300 }, s);
    const all = listThemes(s);
    expect(all.map((t) => t.name)).toEqual(['Board pack', 'Compact']);
  });

  it('returns empty when storage is uninitialised', () => {
    const s = makeStorage();
    expect(listThemes(s)).toEqual([]);
  });

  it('survives a malformed payload', () => {
    const s = makeStorage();
    s.setItem('spc-themes-v1', 'not json');
    expect(listThemes(s)).toEqual([]);
  });

  it('removes one theme without disturbing the others', () => {
    const s = makeStorage();
    saveTheme('A', defaultChartSettings, s);
    saveTheme('B', defaultChartSettings, s);
    deleteTheme('A', s);
    expect(listThemes(s).map((t) => t.name)).toEqual(['B']);
  });
});
