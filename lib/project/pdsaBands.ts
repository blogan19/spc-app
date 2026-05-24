// Translates PDSA cycles linked to a measure into renderable timeline
// bands. The chart paints each band as a translucent stripe across its
// x-axis so the user can see at a glance when a cycle was tested and
// how the data moved during/after it.
//
// One translation table lives here (not in spc.jsx) so the colour
// vocabulary stays unit-testable and consistent if we later show the
// same band styling in other views (e.g. a PDSA log timeline).

import type { PDSAStatus, PDSADecision, Project } from './types';

export interface PdsaBand {
  id: string;
  label: string;
  /** YYYY-MM-DD inclusive. */
  startISO: string;
  /**
   * YYYY-MM-DD inclusive. `null` means the cycle is still in-progress
   * and the chart should extend the band to "today" (or the chart's
   * right edge, whichever is closer).
   */
  endISO: string | null;
  /** Translucent fill colour, intended for ~0.15 opacity overlay. */
  fillColor: string;
  /** Saturated border colour drawn along the band's top edge. */
  borderColor: string;
  status: PDSAStatus;
  decision: PDSADecision | null;
}

interface BandStyle {
  fillColor: string;
  borderColor: string;
}

// Tailwind-palette hex codes — same vocabulary the rest of the UI uses
// so PDSA bands feel like part of the same design system as everything
// else on the page.
const STYLES: Record<string, BandStyle> = {
  inProgress: { fillColor: '#fbbf24', borderColor: '#d97706' }, // amber-400 / amber-600
  studying: { fillColor: '#60a5fa', borderColor: '#2563eb' }, // blue-400 / blue-600
  adopted: { fillColor: '#22c55e', borderColor: '#16a34a' }, // green-500 / green-600
  adapted: { fillColor: '#84cc16', borderColor: '#65a30d' }, // lime-500 / lime-600
  abandoned: { fillColor: '#ef4444', borderColor: '#b91c1c' }, // red-500 / red-700
  cancelled: { fillColor: '#9ca3af', borderColor: '#4b5563' }, // gray-400 / gray-600
};

export function bandStyleFor(status: PDSAStatus, decision: PDSADecision | null): BandStyle {
  if (status === 'in-progress') return STYLES.inProgress;
  if (status === 'studying') return STYLES.studying;
  if (status === 'abandoned') return STYLES.cancelled;
  if (status === 'done') {
    if (decision === 'adopt') return STYLES.adopted;
    if (decision === 'adapt') return STYLES.adapted;
    if (decision === 'abandon') return STYLES.abandoned;
    // 'done' without a decision is unusual but defensible — treat as
    // adapted (changed something, didn't commit) rather than a colour
    // we'd otherwise reserve for true abandonment.
    return STYLES.adapted;
  }
  // 'planning' shouldn't appear — collectPdsaBandsForMeasure filters
  // it out — but return a neutral style just in case.
  return STYLES.cancelled;
}

/**
 * Cycles a measure's chart should paint. Filters out:
 * - cycles linked to a different measure (or no measure)
 * - cycles in 'planning' status (no startDate yet, nothing to draw)
 *
 * The chart uses startISO/endISO to position; endISO=null means the
 * cycle is open and the chart should extend the band to today.
 */
export function collectPdsaBandsForMeasure(
  project: Project,
  measureId: string,
): PdsaBand[] {
  const bands: PdsaBand[] = [];
  for (const cycle of project.pdsaCycles) {
    if (cycle.linkedMeasureId !== measureId) continue;
    if (!cycle.startDate) continue; // 'planning' or never started
    const style = bandStyleFor(cycle.status, cycle.decision);
    bands.push({
      id: cycle.id,
      label: cycle.title,
      startISO: cycle.startDate,
      endISO: cycle.endDate || null,
      status: cycle.status,
      decision: cycle.decision,
      ...style,
    });
  }
  return bands;
}
