import { describe, expect, it } from 'vitest';
import {
  applyIncidentMapping,
  collectIncidentEventsForMeasure,
  countByLocation,
  countBySeverity,
  countByType,
  guessIncidentMapping,
  incidentCountsAroundDate,
  normaliseSeverity,
  parseIncidentCsv,
  timeOfDayByDayOfWeekMatrix,
  typeByLocationMatrix,
} from './incidents';
import { createSeedProject } from './seed';
import type { DriverDiagram, Incident, Project } from './types';

const inc = (
  type: string,
  location: string,
  severity: Incident['severity'] = 'low',
  id = `i-${Math.random()}`,
): Incident => ({
  id,
  datetime: '2025-01-01',
  type,
  location,
  severity,
});

describe('countByType / countByLocation', () => {
  it('groups incidents and returns descending counts', () => {
    const incidents = [
      inc('Falls', 'Ward A'),
      inc('Medication', 'Ward A'),
      inc('Medication', 'Ward B'),
      inc('Medication', 'Ward A'),
    ];
    expect(countByType(incidents)).toEqual([
      { name: 'Medication', count: 3 },
      { name: 'Falls', count: 1 },
    ]);
    expect(countByLocation(incidents)).toEqual([
      { name: 'Ward A', count: 3 },
      { name: 'Ward B', count: 1 },
    ]);
  });

  it('coerces blank values to "Unknown"', () => {
    const incidents = [inc('', ''), inc('Falls', 'Ward A')];
    expect(countByType(incidents)).toEqual([
      { name: 'Falls', count: 1 },
      { name: 'Unknown', count: 1 },
    ]);
  });
});

describe('countBySeverity', () => {
  it('returns severities in canonical order, hiding levels with zero count', () => {
    const incidents = [
      inc('A', 'X', 'severe'),
      inc('B', 'X', 'low'),
      inc('C', 'X', 'low'),
      inc('D', 'X', 'death'),
    ];
    expect(countBySeverity(incidents)).toEqual([
      { severity: 'low', count: 2 },
      { severity: 'severe', count: 1 },
      { severity: 'death', count: 1 },
    ]);
  });
});

describe('typeByLocationMatrix', () => {
  it('sorts rows and columns by marginal totals (most frequent first)', () => {
    const incidents = [
      inc('Falls', 'Ward A'),
      inc('Falls', 'Ward A'),
      inc('Falls', 'Ward B'),
      inc('Medication', 'Ward A'),
      inc('Medication', 'Ward A'),
      inc('Medication', 'Ward A'),
      inc('Medication', 'Ward B'),
      inc('IT', 'Ward C'),
    ];
    const m = typeByLocationMatrix(incidents);
    // Medication (4) outranks Falls (3) outranks IT (1).
    expect(m.rows).toEqual(['Medication', 'Falls', 'IT']);
    // Ward A (5) outranks Ward B (2) and Ward C (1).
    expect(m.cols[0]).toBe('Ward A');
    // Medication × Ward A = 3
    const medRow = m.rows.indexOf('Medication');
    const wardA = m.cols.indexOf('Ward A');
    expect(m.counts[medRow][wardA]).toBe(3);
    expect(m.max).toBe(3);
  });

  it('returns an empty matrix when there are no incidents', () => {
    const m = typeByLocationMatrix([]);
    expect(m.rows).toEqual([]);
    expect(m.cols).toEqual([]);
    expect(m.counts).toEqual([]);
    expect(m.max).toBe(0);
  });
});

describe('normaliseSeverity', () => {
  it('maps common variants to the canonical levels', () => {
    expect(normaliseSeverity('No Harm')).toBe('no-harm');
    expect(normaliseSeverity('moderate')).toBe('moderate');
    expect(normaliseSeverity('Major')).toBe('severe');
    expect(normaliseSeverity('Catastrophic')).toBe('death');
    expect(normaliseSeverity('')).toBe('unknown');
    expect(normaliseSeverity('something weird')).toBe('unknown');
  });
});

describe('parseIncidentCsv + applyIncidentMapping', () => {
  it('parses headers and applies a column mapping to produce Incident[]', () => {
    const csv =
      'when,what,where,severity\n2025-01-02,Falls,Ward A,low\n2025-01-03,Medication,Ward A,severe\n';
    const parsed = parseIncidentCsv(csv);
    expect(parsed.headers).toEqual(['when', 'what', 'where', 'severity']);
    const incidents = applyIncidentMapping(parsed, {
      datetime: 'when',
      type: 'what',
      location: 'where',
      severity: 'severity',
    });
    expect(incidents).toHaveLength(2);
    expect(incidents[0]).toMatchObject({
      datetime: '2025-01-02',
      type: 'Falls',
      location: 'Ward A',
      severity: 'low',
    });
    expect(incidents[1].severity).toBe('severe');
  });

  it('defaults missing severity to "unknown"', () => {
    const csv = 'when,what,where\n2025-01-02,Falls,Ward A\n';
    const parsed = parseIncidentCsv(csv);
    const incidents = applyIncidentMapping(parsed, {
      datetime: 'when',
      type: 'what',
      location: 'where',
    });
    expect(incidents[0].severity).toBe('unknown');
  });
});

describe('timeOfDayByDayOfWeekMatrix', () => {
  const at = (datetime: string): Incident => ({
    id: datetime,
    datetime,
    type: 'T',
    location: 'L',
    severity: 'low',
  });

  it('buckets incidents by Monday-first day and UTC hour', () => {
    const incidents = [
      // 2024-09-02 is a Monday (UTC), 09:00
      at('2024-09-02T09:00:00Z'),
      at('2024-09-02T09:30:00Z'),
      // 2024-09-04 is Wednesday, 14:00
      at('2024-09-04T14:15:00Z'),
      // 2024-09-08 is Sunday, 23:00
      at('2024-09-08T23:00:00Z'),
    ];
    const m = timeOfDayByDayOfWeekMatrix(incidents);
    expect(m.rows).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(m.cols).toHaveLength(24);
    expect(m.counts[0][9]).toBe(2); // Mon 09
    expect(m.counts[2][14]).toBe(1); // Wed 14
    expect(m.counts[6][23]).toBe(1); // Sun 23
    expect(m.max).toBe(2);
    expect(m.parsedRowCount).toBe(4);
    expect(m.unparsedRowCount).toBe(0);
  });

  it('treats date-only inputs as 00:00 UTC', () => {
    // 2024-09-04 is Wednesday.
    const m = timeOfDayByDayOfWeekMatrix([at('2024-09-04')]);
    expect(m.counts[2][0]).toBe(1);
  });

  it('counts unparseable datetimes separately', () => {
    const m = timeOfDayByDayOfWeekMatrix([at('not a date'), at('2024-09-02T09:00:00Z')]);
    expect(m.parsedRowCount).toBe(1);
    expect(m.unparsedRowCount).toBe(1);
  });
});

describe('incidentCountsAroundDate', () => {
  const at = (datetime: string): Incident => ({
    id: datetime,
    datetime,
    type: 'T',
    location: 'L',
    severity: 'low',
  });

  it('counts incidents in equal-duration windows before and after the reference', () => {
    // Reference Sep 8, asOf Sep 14 ⇒ 6-day window each side.
    // Before window covers [Sep 2, Sep 7]; after covers [Sep 8, Sep 14].
    const incidents = [
      at('2024-09-01'), // outside (8 days before)
      at('2024-09-03'),
      at('2024-09-05'),
      at('2024-09-07'),
      at('2024-09-08'),
      at('2024-09-14'),
    ];
    const r = incidentCountsAroundDate(incidents, '2024-09-08', '2024-09-14');
    expect(r).not.toBeNull();
    expect(r?.before).toBe(3);
    expect(r?.after).toBe(2);
    expect(r?.windowDays).toBe(6);
  });

  it('ignores incidents outside both windows', () => {
    const incidents = [at('2024-08-01'), at('2024-09-08'), at('2024-11-30')];
    const r = incidentCountsAroundDate(incidents, '2024-09-08', '2024-09-14');
    expect(r?.before).toBe(0);
    expect(r?.after).toBe(1);
  });

  it('returns null when the reference date is invalid or in the future relative to asOf', () => {
    expect(incidentCountsAroundDate([], 'invalid', '2024-09-14')).toBeNull();
    expect(
      incidentCountsAroundDate([], '2024-09-30', '2024-09-14'),
    ).toBeNull();
  });
});

describe('collectIncidentEventsForMeasure', () => {
  const measureId = 'seed-measure';
  const buildProject = (
    leaves: Array<{ measureId?: string; linkedIncidentType?: string }>,
    incidents: Incident[],
  ): Project => {
    const project = createSeedProject();
    const diagram: DriverDiagram = {
      id: 'd',
      primaryDrivers: [
        {
          id: 'p1',
          label: 'Primary',
          type: 'primary',
          children: [
            {
              id: 's1',
              label: 'Secondary',
              type: 'secondary',
              children: leaves.map((l, i) => ({
                id: `leaf-${i}`,
                label: `Leaf ${i}`,
                type: 'change-idea' as const,
                children: [],
                measureId: l.measureId,
                linkedIncidentType: l.linkedIncidentType,
              })),
            },
          ],
        },
      ],
    };
    return {
      ...project,
      driverDiagram: diagram,
      incidentDataset: {
        id: 'ds',
        importedAt: '2024-01-01',
        rowCount: incidents.length,
        incidents,
      },
    };
  };

  const inc2 = (type: string, datetime: string): Incident => ({
    id: `${type}-${datetime}`,
    datetime,
    type,
    location: 'L',
    severity: 'low',
  });

  it('emits one event per date, aggregating multiple incidents of the same type', () => {
    const project = buildProject(
      [{ measureId, linkedIncidentType: 'Falls' }],
      [
        inc2('Falls', '2024-09-02T10:00:00Z'),
        inc2('Falls', '2024-09-02T14:00:00Z'),
        inc2('Falls', '2024-09-05'),
        inc2('Medication', '2024-09-03'), // unrelated type
      ],
    );
    const events = collectIncidentEventsForMeasure(project, measureId);
    expect(events.map((e) => e.date)).toEqual(['2024-09-02', '2024-09-05']);
    expect(events[0].count).toBe(2);
    expect(events[0].label).toBe('2 × Falls');
    expect(events[1].count).toBe(1);
    expect(events[1].label).toBe('Falls');
  });

  it('ignores leaves linked to a different measure', () => {
    const project = buildProject(
      [
        { measureId: 'other-measure', linkedIncidentType: 'Falls' },
        { measureId, linkedIncidentType: 'Medication' },
      ],
      [inc2('Falls', '2024-09-02'), inc2('Medication', '2024-09-03')],
    );
    const events = collectIncidentEventsForMeasure(project, measureId);
    expect(events.map((e) => e.label)).toEqual(['Medication']);
  });

  it('returns nothing when there is no driver diagram or no incident dataset', () => {
    const project = createSeedProject();
    expect(collectIncidentEventsForMeasure(project, measureId)).toEqual([]);
  });

  it('returns nothing when no leaves have linkedIncidentType set', () => {
    const project = buildProject(
      [{ measureId }],
      [inc2('Falls', '2024-09-02')],
    );
    expect(collectIncidentEventsForMeasure(project, measureId)).toEqual([]);
  });

  it('combines distinct types on the same date in the label', () => {
    const project = buildProject(
      [
        { measureId, linkedIncidentType: 'Falls' },
        { measureId, linkedIncidentType: 'Medication' },
      ],
      [
        inc2('Falls', '2024-09-02'),
        inc2('Medication', '2024-09-02'),
      ],
    );
    const events = collectIncidentEventsForMeasure(project, measureId);
    expect(events).toHaveLength(1);
    expect(events[0].count).toBe(2);
    expect(events[0].label).toBe('2 × Falls, Medication');
  });
});

describe('guessIncidentMapping', () => {
  it('matches obvious headers including LFPSE-ish names', () => {
    const m = guessIncidentMapping([
      'Occurred Date',
      'Incident Type',
      'Location / Ward',
      'Severity',
      'Narrative',
    ]);
    expect(m.datetime).toBe('Occurred Date');
    expect(m.type).toBe('Incident Type');
    expect(m.location).toBe('Location / Ward');
    expect(m.severity).toBe('Severity');
    expect(m.description).toBe('Narrative');
  });
});
