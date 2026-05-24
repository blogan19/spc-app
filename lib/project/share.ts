// URL-safe project encoding for share links.
//
// A project is JSON-serialised, compressed with lz-string and stuffed
// into a route hash. The receiving page (app/share/[hash]/page.tsx)
// decodes and renders the project in view-only mode.
//
// Big projects can produce long URLs — lz-string's URI-safe encoding
// keeps each MeasureRow + comment compact, but if a project has tens of
// thousands of rows the URL will hit browser limits. The current "save
// to localStorage" surface is the primary persistence path; share links
// are a convenience for moderately-sized projects.

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type { Project } from './types';

const SHARE_PREFIX = 'spc1:'; // version marker so we can change format later

export function encodeProjectShare(project: Project): string {
  const payload = SHARE_PREFIX + JSON.stringify(project);
  return compressToEncodedURIComponent(payload);
}

export function decodeProjectShare(token: string): Project | null {
  if (!token) return null;
  try {
    const raw = decompressFromEncodedURIComponent(token);
    if (!raw) return null;
    if (!raw.startsWith(SHARE_PREFIX)) return null;
    const payload = raw.slice(SHARE_PREFIX.length);
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Project;
  } catch {
    return null;
  }
}

export function buildShareUrl(project: Project, origin: string): string {
  const token = encodeProjectShare(project);
  // Keep the slash structure consistent with the dynamic route segment.
  return `${origin.replace(/\/$/, '')}/share/${token}`;
}
