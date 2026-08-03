import type { DashboardState } from './types';

export async function compressState(state: DashboardState): Promise<string> {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  const binary = Array.from(new Uint8Array(buf));
  return btoa(binary.map((b) => String.fromCharCode(b)).join(''));
}

export async function decompressState(b64: string): Promise<DashboardState> {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  const json = new TextDecoder().decode(buf);
  return JSON.parse(json) as DashboardState;
}

export function estimateShareSize(state: DashboardState): number {
  return new TextEncoder().encode(JSON.stringify(state)).length;
}

export function stripDataForShare(state: DashboardState): DashboardState {
  return {
    ...state,
    datasets: state.datasets.map((d) => ({ ...d, rows: [] })),
  };
}
