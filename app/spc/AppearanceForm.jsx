'use client'
// Structured appearance settings for a measure. Sections: Dimensions,
// Title & Axes, Series, Points. Topped by a Theme bar for save/load.

import { useEffect, useState } from 'react';
import {
  applyTheme,
  deleteTheme,
  listThemes,
  randomTheme,
  saveTheme,
} from '@/lib/project/themes';

export default function AppearanceForm({ settings, onUpdate, target, onUpdateTarget }) {
  const [themes, setThemes] = useState([]);
  const [newThemeName, setNewThemeName] = useState('');
  const [savePromptOpen, setSavePromptOpen] = useState(false);

  // Themes live in localStorage which is only available client-side.
  useEffect(() => {
    setThemes(listThemes());
  }, []);

  const handleSaveTheme = () => {
    const name = newThemeName.trim();
    if (!name) return;
    const next = saveTheme(name, settings);
    setThemes(next);
    setNewThemeName('');
    setSavePromptOpen(false);
  };

  const handleLoadTheme = (name) => {
    const theme = themes.find((t) => t.name === name);
    if (!theme) return;
    // Theme load is a wholesale replace, but onUpdate already accepts a
    // partial — passing the merged settings effectively replaces every
    // styling field while leaving content fields (title, labels) intact.
    onUpdate(applyTheme(settings, theme));
  };

  const handleDeleteTheme = (name) => {
    if (!window.confirm(`Delete theme "${name}"?`)) return;
    setThemes(deleteTheme(name));
  };

  const handleRandomTheme = () => {
    onUpdate(randomTheme(settings));
  };

  const num = (v) => Number(v);

  return (
    <div className="space-y-6">
      <ThemeBar
        themes={themes}
        onLoad={handleLoadTheme}
        onDelete={handleDeleteTheme}
        savePromptOpen={savePromptOpen}
        onOpenSavePrompt={() => setSavePromptOpen(true)}
        onCloseSavePrompt={() => setSavePromptOpen(false)}
        newThemeName={newThemeName}
        setNewThemeName={setNewThemeName}
        onSave={handleSaveTheme}
        onRandom={handleRandomTheme}
      />

      <Section title="Dimensions">
        <Grid>
          <Range
            label="Width"
            value={settings.width}
            min={500}
            max={5000}
            step={50}
            onChange={(v) => onUpdate({ width: num(v) })}
            display={`${settings.width} px`}
          />
          <Range
            label="Height"
            value={settings.height}
            min={100}
            max={2000}
            step={10}
            onChange={(v) => onUpdate({ height: num(v) })}
            display={`${settings.height} px`}
          />
          <Range
            label="Margin top"
            value={settings.marginTop}
            min={0}
            max={500}
            step={10}
            onChange={(v) => onUpdate({ marginTop: num(v) })}
            display={`${settings.marginTop} px`}
          />
          <Range
            label="Margin bottom"
            value={settings.marginBottom}
            min={0}
            max={500}
            step={10}
            onChange={(v) => onUpdate({ marginBottom: num(v) })}
            display={`${settings.marginBottom} px`}
          />
          <Range
            label="Margin left"
            value={settings.marginLeft}
            min={0}
            max={500}
            step={10}
            onChange={(v) => onUpdate({ marginLeft: num(v) })}
            display={`${settings.marginLeft} px`}
          />
          <Range
            label="Margin right"
            value={settings.marginRight}
            min={0}
            max={500}
            step={10}
            onChange={(v) => onUpdate({ marginRight: num(v) })}
            display={`${settings.marginRight} px`}
          />
        </Grid>
      </Section>

      <Section title="Title & Axes">
        <Grid>
          <Field label="Chart title">
            <input
              type="text"
              value={settings.title ?? ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </Field>
          <Range
            label="Title size"
            value={settings.titleSize}
            min={10}
            max={50}
            step={1}
            onChange={(v) => onUpdate({ titleSize: num(v) })}
            display={`${settings.titleSize} pt`}
          />
          <Field label="X-axis label">
            <input
              type="text"
              value={settings.xAxisLabel ?? ''}
              onChange={(e) => onUpdate({ xAxisLabel: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </Field>
          <Field label="Y-axis label">
            <input
              type="text"
              value={settings.yAxisLabel ?? ''}
              onChange={(e) => onUpdate({ yAxisLabel: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </Field>
          <Range
            label="Axis label size"
            value={settings.axisLabelSize ?? 12}
            min={8}
            max={32}
            step={1}
            onChange={(v) => onUpdate({ axisLabelSize: num(v) })}
            display={`${settings.axisLabelSize ?? 12} pt`}
          />
        </Grid>
      </Section>

      <Section title="Lines">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showMean ?? true}
              onChange={(e) => onUpdate({ showMean: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
            Show average line
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showLimits ?? true}
              onChange={(e) => onUpdate({ showLimits: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
            Show control limits
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showTarget ?? true}
              onChange={(e) => onUpdate({ showTarget: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
            Show target line
          </label>
          {typeof onUpdateTarget === 'function' && (
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Target value</span>
              <input
                type="number"
                value={target ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onUpdateTarget(v === '' ? undefined : Number(v));
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                placeholder="—"
              />
            </label>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showForecast ?? false}
              onChange={(e) => onUpdate({ showForecast: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
            Show forecast band
          </label>
          {settings.showForecast && (
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Periods ahead</span>
              <input
                type="number"
                min={1}
                max={36}
                value={settings.forecastPeriods ?? 6}
                onChange={(e) => onUpdate({ forecastPeriods: num(e.target.value) })}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
              />
            </label>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Average uses</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="centre-line-kind"
              checked={(settings.centreLineKind ?? 'mean') === 'mean'}
              onChange={() => onUpdate({ centreLineKind: 'mean' })}
            />
            Mean
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="centre-line-kind"
              checked={settings.centreLineKind === 'median'}
              onChange={() => onUpdate({ centreLineKind: 'median' })}
            />
            Median
          </label>
        </div>
      </Section>

      <Section title="Logo">
        <LogoField
          logoDataUrl={settings.logoDataUrl ?? ''}
          onSet={(url) => onUpdate({ logoDataUrl: url })}
        />
      </Section>

      <Section title="Series">
        <SeriesRow
          name="Data line"
          color={settings.lineColor}
          width={settings.lineWidth}
          onColor={(c) => onUpdate({ lineColor: c })}
          onWidth={(w) => onUpdate({ lineWidth: num(w) })}
        />
        <SeriesRow
          name="Mean (centre)"
          color={settings.medianColor}
          width={settings.medianWidth}
          onColor={(c) => onUpdate({ medianColor: c })}
          onWidth={(w) => onUpdate({ medianWidth: num(w) })}
        />
        <SeriesRow
          name="Control limits"
          color={settings.confColor}
          width={settings.confWidth}
          onColor={(c) => onUpdate({ confColor: c })}
          onWidth={(w) => onUpdate({ confWidth: num(w) })}
        />
      </Section>

      <Section title="Points">
        <Grid>
          <Field label="Background colour">
            <input
              type="color"
              value={settings.backgroundColor ?? '#ffffff'}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            />
          </Field>
          <Field label="Default colour">
            <input
              type="color"
              value={settings.defaultPointColor}
              onChange={(e) => onUpdate({ defaultPointColor: e.target.value })}
            />
          </Field>
          <Field label="Improvement colour">
            <input
              type="color"
              value={settings.successColor}
              onChange={(e) => onUpdate({ successColor: e.target.value })}
            />
          </Field>
          <Field label="Concerning colour">
            <input
              type="color"
              value={settings.outlierColor}
              onChange={(e) => onUpdate({ outlierColor: e.target.value })}
            />
          </Field>
          <Field label="Highlight special cause">
            <input
              type="checkbox"
              checked={Boolean(settings.outlierStatus)}
              onChange={(e) => onUpdate({ outlierStatus: e.target.checked })}
            />
          </Field>
        </Grid>
      </Section>
    </div>
  );
}

function ThemeBar({
  themes,
  onLoad,
  onDelete,
  savePromptOpen,
  onOpenSavePrompt,
  onCloseSavePrompt,
  newThemeName,
  setNewThemeName,
  onSave,
  onRandom,
}) {
  return (
    <div className="border border-gray-200 bg-white rounded-md p-3 flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-gray-500">Theme</span>

      <select
        className="border border-gray-300 rounded px-2 py-1 text-sm"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) onLoad(v);
          e.target.value = '';
        }}
      >
        <option value="">Load theme…</option>
        {themes.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>

      {savePromptOpen ? (
        <>
          <input
            autoFocus
            type="text"
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="Theme name"
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCloseSavePrompt();
            }}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={!newThemeName.trim()}
            className="text-sm px-3 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCloseSavePrompt}
            className="text-sm px-3 py-1 rounded border border-gray-300"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onOpenSavePrompt}
          className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
        >
          Save current as theme…
        </button>
      )}

      <button
        type="button"
        onClick={onRandom}
        className="text-sm px-3 py-1 rounded border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
        title="Replace the visual styling with a randomly picked palette"
      >
        Random theme
      </button>

      {themes.length > 0 && (
        <details className="ml-auto">
          <summary className="text-xs text-gray-500 cursor-pointer">Manage</summary>
          <ul className="absolute right-2 bg-white border border-gray-200 rounded shadow p-2 mt-1 z-10 text-sm space-y-1">
            {themes.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3">
                <span>{t.name}</span>
                <button
                  type="button"
                  onClick={() => onDelete(t.name)}
                  className="text-red-600 text-xs"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-1 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">{children}</div>;
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-gray-700">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function Range({ label, value, min, max, step, onChange, display }) {
  return (
    <label className="flex flex-col text-sm">
      <div className="flex justify-between text-gray-700">
        <span>{label}</span>
        <span className="text-gray-500 text-xs">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </label>
  );
}

function LogoField({ logoDataUrl, onSet }) {
  const onFile = (file) => {
    if (!file) return onSet('');
    if (!/^image\//.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      onSet(result);
    };
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-3 text-sm">
      {logoDataUrl ? (
        <>
          <img
            src={logoDataUrl}
            alt="Chart logo"
            className="h-10 w-auto border border-gray-200 rounded bg-white p-1"
          />
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
          <label className="px-2 py-1 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-xs">
            Replace…
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </>
      ) : (
        <label className="px-3 py-1.5 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
          Upload a logo…
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <span className="text-xs text-gray-500">
        Rendered in the top-right of the chart.
      </span>
    </div>
  );
}

function SeriesRow({ name, color, width, onColor, onWidth }) {
  return (
    <div className="flex items-center gap-4 mb-2 text-sm">
      <span className="w-32 text-gray-700">{name}</span>
      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Colour</span>
        <input
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 flex-1">
        <span className="text-xs text-gray-500">Width</span>
        <input
          type="range"
          value={width}
          min={1}
          max={5}
          step={1}
          onChange={(e) => onWidth(e.target.value)}
          className="flex-1"
        />
        <span className="text-xs text-gray-500 w-6">{width}</span>
      </label>
    </div>
  );
}
