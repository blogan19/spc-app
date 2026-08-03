'use client';

import type { DashboardTheme, PaletteKind, BackgroundKind, TileBorderRadius } from '@/lib/dashboard/types';

interface ThemePanelProps {
  theme: DashboardTheme;
  onChange: (theme: DashboardTheme) => void;
  onClose: () => void;
}

const PALETTES: { value: PaletteKind; label: string; colors: string[] }[] = [
  { value: 'nhs', label: 'NHS Standard', colors: ['#003087', '#005EB8', '#41B6E6', '#007f3b', '#d5281b'] },
  { value: 'monochrome', label: 'Monochrome', colors: ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'] },
  { value: 'pastel', label: 'Pastel', colors: ['#93c5fd', '#6ee7b7', '#fca5a5', '#fde68a', '#c4b5fd'] },
  {
    value: 'highContrast',
    label: 'High Contrast',
    colors: ['#000000', '#0000ff', '#ff6600', '#007700', '#880000'],
  },
];

const BACKGROUNDS: { value: BackgroundKind; label: string }[] = [
  { value: 'white', label: 'White' },
  { value: 'lightGrey', label: 'Light grey' },
  { value: 'dark', label: 'Dark' },
];

const RADII: { value: TileBorderRadius; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
];

export default function ThemePanel({ theme, onChange, onClose }: ThemePanelProps) {
  const set = (patch: Partial<DashboardTheme>) => onChange({ ...theme, ...patch });

  return (
    <div className="fixed top-[53px] right-0 bottom-0 w-72 bg-white border-l border-gray-200 z-30 overflow-y-auto shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Dashboard Theme</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close theme panel"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Colour palette */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Colour palette
          </p>
          <div className="space-y-2">
            {PALETTES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set({ palette: p.value })}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  theme.palette === p.value
                    ? 'border-[#005EB8] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-0.5">
                  {p.colors.map((c) => (
                    <span
                      key={c}
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span
                  className={`text-xs font-medium ${
                    theme.palette === p.value ? 'text-[#005EB8]' : 'text-gray-700'
                  }`}
                >
                  {p.label}
                </span>
                {theme.palette === p.value && (
                  <span className="ml-auto text-[#005EB8] text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Background
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => set({ background: b.value })}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  theme.background === b.value
                    ? 'border-[#005EB8] bg-blue-50 text-[#005EB8]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font family */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Font</p>
          <select
            value={theme.fontFamily}
            onChange={(e) => set({ fontFamily: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Arial">Arial</option>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
        </div>

        {/* Border radius */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Tile corners
          </p>
          <div className="grid grid-cols-3 gap-2">
            {RADII.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => set({ borderRadius: r.value })}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  theme.borderRadius === r.value
                    ? 'border-[#005EB8] bg-blue-50 text-[#005EB8]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tile border toggle */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Tile border
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={theme.tileBorder}
              onClick={() => set({ tileBorder: !theme.tileBorder })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                theme.tileBorder ? 'bg-[#005EB8]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  theme.tileBorder ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Grid lines toggle */}
        <div>
          <label className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Grid lines
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={theme.gridLines}
              onClick={() => set({ gridLines: !theme.gridLines })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                theme.gridLines ? 'bg-[#005EB8]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  theme.gridLines ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Data freshness threshold */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Data freshness warning
          </p>
          <select
            value={theme.stalenessThresholdDays}
            onChange={(e) => set({ stalenessThresholdDays: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Weekly (7 days)</option>
            <option value={35}>Monthly (35 days)</option>
            <option value={92}>Quarterly (92 days)</option>
            <option value={400}>Never warn</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Tiles show an amber warning when data is older than this.
          </p>
        </div>

        {/* Financial year start */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Financial year start
          </p>
          <select
            value={theme.fyStartMonth ?? 4}
            onChange={(e) => set({ fyStartMonth: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>January (calendar year)</option>
            <option value={4}>April (NHS / UK default)</option>
            <option value={7}>July</option>
            <option value={10}>October</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Used when bar or line charts group data by financial year, quarter, or month.
          </p>
        </div>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          Theme changes apply immediately. SPC chart colours are set per chart in the chart editor.
        </p>
      </div>
    </div>
  );
}
