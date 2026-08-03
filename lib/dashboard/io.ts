import type { DashboardState, DashboardTheme } from './types';
import { nhsTheme } from './seed';

export interface SnapshotMeta {
  id: string;
  name: string;
  notes: string;
  takenAt: string;
  json: string; // serialised DashboardState + snapshot metadata
}

export function serialiseDashboard(state: DashboardState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function downloadDashboard(state: DashboardState) {
  const title = state.dashboard.title || 'dashboard';
  const json = serialiseDashboard(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.dashboard.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function serialiseSnapshot(state: DashboardState, name: string, notes: string): string {
  const now = new Date().toISOString();
  return JSON.stringify(
    { ...state, exportedAt: now, snapshotName: name, snapshotNotes: notes, snapshotTakenAt: now },
    null,
    2,
  );
}

export function downloadSnapshot(state: DashboardState, name: string, notes: string): string {
  const json = serialiseSnapshot(state, name, notes);
  const slug = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'snapshot';
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.snapshot.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return json;
}

export function downloadTemplate(state: DashboardState) {
  const title = state.dashboard.title || 'dashboard';
  const templateState = {
    ...state,
    exportedAt: new Date().toISOString(),
    type: 'template' as const,
    datasets: state.datasets.map((d) => ({ ...d, rows: [] })),
  };
  const json = JSON.stringify(templateState, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.template.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadDashboardFile(file: File): Promise<DashboardState> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid dashboard file.');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== '2.0') {
    throw new Error(
      'Not a valid dashboard file. If this is a single SPC chart, open it from the SPC Chart page instead.',
    );
  }
  // snapshot files are accepted — snapshot metadata fields are simply ignored
  if (!obj.dashboard || !Array.isArray(obj.datasets)) {
    throw new Error('Invalid dashboard structure.');
  }
  const state = parsed as DashboardState;
  // Fill in defaults for fields added after the file was saved
  const theme = state.dashboard.theme as Partial<DashboardTheme>;
  state.dashboard.theme = { ...nhsTheme, ...theme } as DashboardTheme;
  state.ragRules = state.ragRules ?? [];
  state.metrics = state.metrics ?? [];
  state.annotations = state.annotations ?? [];
  state.stories = state.stories ?? [];
  state.slideDecks = state.slideDecks ?? [];
  return state;
}
