// Recalculation segmentation. A row with `recalculate: true` marks the FIRST
// point of a new segment — every subsequent point belongs to that segment
// until the next recalculate flag (or end of data).
//
// The first segment always starts at index 0, regardless of whether index 0
// carries the flag.

import type { AnalysisKind, SpcPointLimits, SpcRow, SpcSegment } from './types';
import { runChartCentre, xmrLimits } from './xmr';

export interface SegmentationResult {
  segments: SpcSegment[];
  pointLimits: SpcPointLimits[]; // length === rows.length
}

export function computeSegments(
  rows: readonly SpcRow[],
  kind: AnalysisKind = 'XmR',
): SegmentationResult {
  if (rows.length === 0) {
    return { segments: [], pointLimits: [] };
  }

  // Identify segment start indices. Index 0 is always a start.
  const starts: number[] = [0];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].recalculate) starts.push(i);
  }

  const segments: SpcSegment[] = [];
  for (let s = 0; s < starts.length; s++) {
    const startIndex = starts[s];
    const endIndex = s + 1 < starts.length ? starts[s + 1] - 1 : rows.length - 1;
    const values = rows.slice(startIndex, endIndex + 1).map((r) => r.value);
    segments.push(
      kind === 'RunChart'
        ? runChartCentre(values, startIndex, endIndex)
        : xmrLimits(values, startIndex, endIndex),
    );
  }

  // Project each row onto the limits that apply to it.
  const pointLimits: SpcPointLimits[] = new Array(rows.length);
  for (const seg of segments) {
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      pointLimits[i] = {
        mean: seg.mean,
        median: seg.median,
        ucl: seg.ucl,
        lcl: seg.lcl,
      };
    }
  }

  return { segments, pointLimits };
}
