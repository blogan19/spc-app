import { describe, expect, it } from 'vitest';
import { bandStyleFor, collectPdsaBandsForMeasure } from './pdsaBands';
import type { PDSACycle, Project } from './types';

function makeCycle(overrides: Partial<PDSACycle>): PDSACycle {
  return {
    id: 'c1',
    title: 'Cycle 1',
    status: 'in-progress',
    createdAt: '2026-05-01T00:00:00Z',
    question: '',
    prediction: '',
    predictionLockedAt: null,
    startDate: '',
    doNotes: '',
    endDate: '',
    result: '',
    decision: null,
    actNotes: '',
    linkedMeasureId: 'm1',
    ...overrides,
  };
}

function makeProject(cycles: PDSACycle[]): Project {
  return {
    id: 'p1',
    name: 'Test',
    createdAt: '2026-05-01T00:00:00Z',
    aim: { text: '' },
    measures: [],
    pdsaCycles: cycles,
    driverDiagram: null,
    ishikawa: null,
    processMap: null,
    incidentDataset: null,
  };
}

describe('bandStyleFor', () => {
  it('in-progress → amber', () => {
    const s = bandStyleFor('in-progress', null);
    expect(s.fillColor).toBe('#fbbf24');
  });

  it('studying → blue', () => {
    const s = bandStyleFor('studying', null);
    expect(s.fillColor).toBe('#60a5fa');
  });

  it('done + adopt → green', () => {
    const s = bandStyleFor('done', 'adopt');
    expect(s.fillColor).toBe('#22c55e');
  });

  it('done + adapt → lime', () => {
    const s = bandStyleFor('done', 'adapt');
    expect(s.fillColor).toBe('#84cc16');
  });

  it('done + abandon → red', () => {
    const s = bandStyleFor('done', 'abandon');
    expect(s.fillColor).toBe('#ef4444');
  });

  it('abandoned status → gray (cancelled, not the abandon-as-decision red)', () => {
    const s = bandStyleFor('abandoned', null);
    expect(s.fillColor).toBe('#9ca3af');
  });

  it('done without a decision → falls back to lime (defensive)', () => {
    const s = bandStyleFor('done', null);
    expect(s.fillColor).toBe('#84cc16');
  });
});

describe('collectPdsaBandsForMeasure', () => {
  it('includes cycles linked to the measure that have started', () => {
    const project = makeProject([
      makeCycle({
        id: 'c1',
        title: 'Reduce falls',
        status: 'in-progress',
        startDate: '2026-05-01',
        linkedMeasureId: 'm1',
      }),
    ]);
    const bands = collectPdsaBandsForMeasure(project, 'm1');
    expect(bands).toHaveLength(1);
    expect(bands[0]).toMatchObject({
      id: 'c1',
      label: 'Reduce falls',
      startISO: '2026-05-01',
      endISO: null,
      status: 'in-progress',
    });
  });

  it('excludes cycles linked to a different measure', () => {
    const project = makeProject([
      makeCycle({ id: 'c1', startDate: '2026-05-01', linkedMeasureId: 'other' }),
    ]);
    expect(collectPdsaBandsForMeasure(project, 'm1')).toEqual([]);
  });

  it('excludes cycles with no start date (still planning)', () => {
    const project = makeProject([
      makeCycle({ id: 'c1', status: 'planning', startDate: '', linkedMeasureId: 'm1' }),
    ]);
    expect(collectPdsaBandsForMeasure(project, 'm1')).toEqual([]);
  });

  it('preserves the end date when present', () => {
    const project = makeProject([
      makeCycle({
        id: 'c1',
        status: 'done',
        startDate: '2026-05-01',
        endDate: '2026-06-15',
        decision: 'adopt',
        linkedMeasureId: 'm1',
      }),
    ]);
    const [band] = collectPdsaBandsForMeasure(project, 'm1');
    expect(band.endISO).toBe('2026-06-15');
    expect(band.fillColor).toBe('#22c55e'); // adopted = green
  });

  it('returns one band per matching cycle', () => {
    const project = makeProject([
      makeCycle({ id: 'c1', startDate: '2026-05-01', linkedMeasureId: 'm1' }),
      makeCycle({ id: 'c2', startDate: '2026-06-01', linkedMeasureId: 'm1', status: 'studying' }),
      makeCycle({ id: 'c3', startDate: '2026-07-01', linkedMeasureId: 'other' }),
    ]);
    const bands = collectPdsaBandsForMeasure(project, 'm1');
    expect(bands.map((b) => b.id)).toEqual(['c1', 'c2']);
  });
});
