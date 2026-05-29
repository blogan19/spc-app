// Pure immutable updates over a Project. The container holds a single
// Project in state; every change is a pure function that returns a new
// Project. Keeps the UI components dumb and the data shape testable.

import type {
  AimStatement,
  ChartSettings,
  DriverDiagram,
  DriverNode,
  DriverNodeType,
  IshikawaCategory,
  IshikawaDiagram,
  Measure,
  MeasureRow,
  PDSACycle,
  PDSADecision,
  ProcessMap,
  ProcessStep,
  Project,
  RecalcJustification,
} from './types';
import { emptyMeasure } from './seed';

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function updateAim(project: Project, patch: Partial<AimStatement>): Project {
  return { ...project, aim: { ...project.aim, ...patch } };
}

/**
 * Compose a human-readable sentence from the structured aim fields. Falls
 * back to free-text when the structured fields are empty.
 */
export function composeAimSentence(aim: AimStatement): string {
  const { population, metric, direction, magnitude, deadline, text } = aim;
  const hasStructured = Boolean(
    population || metric || direction || magnitude || deadline,
  );
  if (!hasStructured) return (text ?? '').trim();

  const verb =
    direction === 'increase' ? 'Increase' : direction === 'decrease' ? 'Reduce' : 'Maintain';
  const parts: string[] = [verb];
  if (metric) parts.push(metric);
  if (population) parts.push(`for ${population}`);
  if (magnitude) {
    const connector =
      /^by\b|^to\b|^above\b|^below\b/i.test(magnitude.trim()) ? '' : 'to ';
    parts.push(`${connector}${magnitude}`.trim());
  }
  if (deadline) parts.push(`by ${deadline}`);
  return parts.join(' ').replace(/\s+/g, ' ').trim() + '.';
}

// --- Driver diagram operations -------------------------------------------

const childTypeFor = (parentType: DriverNodeType): DriverNodeType | null => {
  if (parentType === 'primary') return 'secondary';
  if (parentType === 'secondary') return 'change-idea';
  return null; // change ideas are leaves
};

function mapNode(
  nodes: DriverNode[],
  fn: (n: DriverNode) => DriverNode | null,
): DriverNode[] {
  const out: DriverNode[] = [];
  for (const n of nodes) {
    const replaced = fn({ ...n, children: mapNode(n.children, fn) });
    if (replaced !== null) out.push(replaced);
  }
  return out;
}

export function ensureDriverDiagram(project: Project): {
  project: Project;
  diagram: DriverDiagram;
} {
  if (project.driverDiagram) {
    return { project, diagram: project.driverDiagram };
  }
  const diagram: DriverDiagram = { id: newId('driver-diagram'), primaryDrivers: [] };
  return { project: { ...project, driverDiagram: diagram }, diagram };
}

export function setDriverDiagram(project: Project, diagram: DriverDiagram): Project {
  return { ...project, driverDiagram: diagram };
}

export function addPrimaryDriver(diagram: DriverDiagram, label: string): DriverDiagram {
  return {
    ...diagram,
    primaryDrivers: [
      ...diagram.primaryDrivers,
      { id: newId('node'), label, type: 'primary', children: [] },
    ],
  };
}

export function addChildNode(
  diagram: DriverDiagram,
  parentId: string,
  label: string,
): DriverDiagram {
  return {
    ...diagram,
    primaryDrivers: mapNode(diagram.primaryDrivers, (n) => {
      if (n.id !== parentId) return n;
      const childType = childTypeFor(n.type);
      if (childType === null) return n;
      return {
        ...n,
        children: [
          ...n.children,
          { id: newId('node'), label, type: childType, children: [] },
        ],
      };
    }),
  };
}

export function updateDriverNode(
  diagram: DriverDiagram,
  nodeId: string,
  patch: Partial<Pick<DriverNode, 'label' | 'measureId' | 'linkedIncidentType'>>,
): DriverDiagram {
  return {
    ...diagram,
    primaryDrivers: mapNode(diagram.primaryDrivers, (n) =>
      n.id === nodeId ? { ...n, ...patch } : n,
    ),
  };
}

export function removeDriverNode(diagram: DriverDiagram, nodeId: string): DriverDiagram {
  return {
    ...diagram,
    primaryDrivers: mapNode(diagram.primaryDrivers, (n) => (n.id === nodeId ? null : n)),
  };
}

// --- PDSA cycles ----------------------------------------------------------

function mapPDSACycle(
  project: Project,
  cycleId: string,
  fn: (c: PDSACycle) => PDSACycle,
): Project {
  return {
    ...project,
    pdsaCycles: project.pdsaCycles.map((c) => (c.id === cycleId ? fn(c) : c)),
  };
}

export function addPDSACycle(project: Project, title: string): { project: Project; cycleId: string } {
  const id = newId('pdsa');
  const cycle: PDSACycle = {
    id,
    title: title.trim() || `Cycle ${project.pdsaCycles.length + 1}`,
    status: 'planning',
    createdAt: new Date().toISOString(),
    question: '',
    prediction: '',
    predictionLockedAt: null,
    startDate: '',
    doNotes: '',
    endDate: '',
    result: '',
    decision: null,
    actNotes: '',
  };
  return { project: { ...project, pdsaCycles: [...project.pdsaCycles, cycle] }, cycleId: id };
}

/**
 * Partial update. The prediction field is silently ignored when the
 * cycle's prediction is already locked — i.e. when the team has moved
 * to "Do". This is the central discipline of PDSA: predictions cannot
 * be rewritten to match the result.
 */
export function updatePDSACycle(
  project: Project,
  cycleId: string,
  patch: Partial<Omit<PDSACycle, 'id' | 'createdAt' | 'status' | 'predictionLockedAt'>>,
): Project {
  return mapPDSACycle(project, cycleId, (c) => {
    const next: PDSACycle = { ...c, ...patch };
    if (c.predictionLockedAt && patch.prediction !== undefined) {
      next.prediction = c.prediction;
    }
    return next;
  });
}

export function startPDSADo(project: Project, cycleId: string, startDate?: string): Project {
  return mapPDSACycle(project, cycleId, (c) => {
    if (c.status !== 'planning') return c;
    const now = new Date().toISOString();
    return {
      ...c,
      status: 'in-progress',
      predictionLockedAt: now,
      startDate: startDate || c.startDate || now.substring(0, 10),
    };
  });
}

export function startPDSAStudy(project: Project, cycleId: string, endDate?: string): Project {
  return mapPDSACycle(project, cycleId, (c) => {
    if (c.status !== 'in-progress') return c;
    const today = new Date().toISOString().substring(0, 10);
    return { ...c, status: 'studying', endDate: endDate || c.endDate || today };
  });
}

export function completePDSACycle(
  project: Project,
  cycleId: string,
  decision: PDSADecision,
): Project {
  return mapPDSACycle(project, cycleId, (c) => {
    if (c.status !== 'studying') return c;
    return { ...c, status: 'done', decision };
  });
}

export function abandonPDSACycle(project: Project, cycleId: string): Project {
  return mapPDSACycle(project, cycleId, (c) => ({ ...c, status: 'abandoned' }));
}

export function removePDSACycle(project: Project, cycleId: string): Project {
  return {
    ...project,
    pdsaCycles: project.pdsaCycles.filter((c) => c.id !== cycleId),
  };
}

// --- Ishikawa diagram ----------------------------------------------------

/**
 * Healthcare-friendly default categories. Users can rename freely —
 * these labels are just a starting point that maps roughly to the
 * industrial 6 Ms but reads more naturally for clinical teams.
 */
export const DEFAULT_ISHIKAWA_CATEGORIES = [
  'People',
  'Process',
  'Equipment',
  'Materials',
  'Environment',
  'Measurement',
] as const;

export function ensureIshikawaDiagram(project: Project): {
  project: Project;
  diagram: IshikawaDiagram;
} {
  if (project.ishikawa) return { project, diagram: project.ishikawa };
  const diagram: IshikawaDiagram = {
    id: newId('ishikawa'),
    problem: '',
    categories: DEFAULT_ISHIKAWA_CATEGORIES.map((label) => ({
      id: newId('cat'),
      label,
      causes: [],
    })),
  };
  return { project: { ...project, ishikawa: diagram }, diagram };
}

export function setIshikawaDiagram(project: Project, diagram: IshikawaDiagram): Project {
  return { ...project, ishikawa: diagram };
}

export function setIshikawaProblem(
  diagram: IshikawaDiagram,
  problem: string,
): IshikawaDiagram {
  return { ...diagram, problem };
}

export function addIshikawaCategory(
  diagram: IshikawaDiagram,
  label: string,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: [
      ...diagram.categories,
      { id: newId('cat'), label, causes: [] },
    ],
  };
}

export function updateIshikawaCategory(
  diagram: IshikawaDiagram,
  categoryId: string,
  patch: Partial<Pick<IshikawaCategory, 'label'>>,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: diagram.categories.map((c) =>
      c.id === categoryId ? { ...c, ...patch } : c,
    ),
  };
}

export function removeIshikawaCategory(
  diagram: IshikawaDiagram,
  categoryId: string,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: diagram.categories.filter((c) => c.id !== categoryId),
  };
}

export function addIshikawaCause(
  diagram: IshikawaDiagram,
  categoryId: string,
  label: string,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: diagram.categories.map((c) =>
      c.id !== categoryId
        ? c
        : { ...c, causes: [...c.causes, { id: newId('cause'), label }] },
    ),
  };
}

export function updateIshikawaCause(
  diagram: IshikawaDiagram,
  causeId: string,
  label: string,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: diagram.categories.map((c) => ({
      ...c,
      causes: c.causes.map((x) => (x.id === causeId ? { ...x, label } : x)),
    })),
  };
}

export function removeIshikawaCause(
  diagram: IshikawaDiagram,
  causeId: string,
): IshikawaDiagram {
  return {
    ...diagram,
    categories: diagram.categories.map((c) => ({
      ...c,
      causes: c.causes.filter((x) => x.id !== causeId),
    })),
  };
}

// --- Process map ---------------------------------------------------------

export function ensureProcessMap(project: Project): {
  project: Project;
  map: ProcessMap;
} {
  if (project.processMap) return { project, map: project.processMap };
  const map: ProcessMap = { id: newId('process-map'), title: '', steps: [] };
  return { project: { ...project, processMap: map }, map };
}

export function setProcessMap(project: Project, map: ProcessMap): Project {
  return { ...project, processMap: map };
}

export function setProcessMapTitle(map: ProcessMap, title: string): ProcessMap {
  return { ...map, title };
}

export function setProcessMapDescription(
  map: ProcessMap,
  description: string,
): ProcessMap {
  return { ...map, description };
}

export function addProcessStep(
  map: ProcessMap,
  step: Pick<ProcessStep, 'label' | 'type'> &
    Partial<Pick<ProcessStep, 'role' | 'notes'>>,
): ProcessMap {
  return {
    ...map,
    steps: [
      ...map.steps,
      {
        id: newId('step'),
        label: step.label,
        type: step.type,
        role: step.role,
        notes: step.notes,
      },
    ],
  };
}

export function updateProcessStep(
  map: ProcessMap,
  stepId: string,
  patch: Partial<Omit<ProcessStep, 'id'>>,
): ProcessMap {
  return {
    ...map,
    steps: map.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  };
}

export function removeProcessStep(map: ProcessMap, stepId: string): ProcessMap {
  return { ...map, steps: map.steps.filter((s) => s.id !== stepId) };
}

/** Move a step up or down by one position. Out-of-bounds moves are no-ops. */
export function moveProcessStep(
  map: ProcessMap,
  stepId: string,
  direction: 'up' | 'down',
): ProcessMap {
  const idx = map.steps.findIndex((s) => s.id === stepId);
  if (idx === -1) return map;
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= map.steps.length) return map;
  const steps = map.steps.slice();
  [steps[idx], steps[target]] = [steps[target], steps[idx]];
  return { ...map, steps };
}

export function updateProjectName(project: Project, name: string): Project {
  return { ...project, name };
}

function mapMeasure(
  project: Project,
  measureId: string,
  fn: (m: Measure) => Measure,
): Project {
  return {
    ...project,
    measures: project.measures.map((m) => (m.id === measureId ? fn(m) : m)),
  };
}

export function updateMeasureMeta(
  project: Project,
  measureId: string,
  patch: Partial<
    Pick<Measure, 'name' | 'type' | 'chartKind' | 'aim' | 'target' | 'splitBy' | 'increment'>
  >,
): Project {
  return mapMeasure(project, measureId, (m) => ({ ...m, ...patch }));
}

export function updateMeasureSettings(
  project: Project,
  measureId: string,
  patch: Partial<ChartSettings>,
): Project {
  return mapMeasure(project, measureId, (m) => ({
    ...m,
    settings: { ...m.settings, ...patch },
  }));
}

export function setMeasureRows(
  project: Project,
  measureId: string,
  rows: MeasureRow[],
): Project {
  return mapMeasure(project, measureId, (m) => ({ ...m, data: rows }));
}

// Initial date-setup commit: rows and the increment land together so
// later renders never see rows without the increment that produced them
// (the chart axis formatter needs both).
export function setMeasureSetup(
  project: Project,
  measureId: string,
  rows: MeasureRow[],
  increment: Measure['increment'],
  meta?: {
    name?: string;
    settings?: Partial<ChartSettings>;
  },
): Project {
  return mapMeasure(project, measureId, (m) => ({
    ...m,
    data: rows,
    increment,
    ...(meta?.name ? { name: meta.name } : {}),
    settings: meta?.settings ? { ...m.settings, ...meta.settings } : m.settings,
  }));
}

export function addMeasure(project: Project, name: string): { project: Project; measureId: string } {
  const id = newId('measure');
  const measure = emptyMeasure(id, name);
  return {
    project: { ...project, measures: [...project.measures, measure] },
    measureId: id,
  };
}

export function deleteMeasure(project: Project, measureId: string): Project {
  return {
    ...project,
    measures: project.measures.filter((m) => m.id !== measureId),
  };
}

// Row-level helpers --------------------------------------------------------

export function addEmptyRow(project: Project, measureId: string, date: string): Project {
  return mapMeasure(project, measureId, (m) => ({
    ...m,
    data: [
      ...m.data,
      { date, value: '', comment: { title: '', label: '', recalculate: false } },
    ],
  }));
}

export type RowField =
  | 'date'
  | 'value'
  | 'denominator'
  | 'commentTitle'
  | 'commentText'
  | 'commentLockedAt';

export function updateRowField(
  project: Project,
  measureId: string,
  rowIndex: number,
  field: RowField,
  value: string,
): Project {
  return mapMeasure(project, measureId, (m) => {
    const data = m.data.map((row, i) => {
      if (i !== rowIndex) return row;
      switch (field) {
        case 'date':
          return { ...row, date: value };
        case 'value':
          return { ...row, value };
        case 'denominator':
          return { ...row, denominator: value };
        case 'commentTitle':
          return { ...row, comment: { ...row.comment, title: value } };
        case 'commentText':
          return { ...row, comment: { ...row.comment, label: value } };
        case 'commentLockedAt':
          // Empty string clears the lock (used when the user explicitly
          // re-opens an annotation for editing); a non-empty string is
          // expected to be an ISO timestamp.
          return {
            ...row,
            comment: { ...row.comment, lockedAt: value === '' ? null : value },
          };
      }
    });
    return { ...m, data };
  });
}

export function setRowRecalculation(
  project: Project,
  measureId: string,
  rowIndex: number,
  justification: RecalcJustification | null,
): Project {
  return mapMeasure(project, measureId, (m) => {
    const data = m.data.map((row, i) =>
      i === rowIndex
        ? {
            ...row,
            comment: {
              ...row.comment,
              recalculate: Boolean(justification),
              recalcJustification: justification ?? null,
              // Promote the justification text into a chart annotation
              // so the change appears on the graph without the user
              // having to retype it. Existing user-typed annotations are
              // preserved (only empty fields are filled). Lock timestamp
              // matches the justification's confirmedAt so the audit
              // trail lines up.
              ...(justification
                ? {
                    title: row.comment?.title || shortTitleFromReason(justification.reason),
                    label: row.comment?.label || justification.reason,
                    lockedAt: row.comment?.lockedAt ?? justification.confirmedAt,
                  }
                : {}),
            },
          }
        : row,
    );
    return { ...m, data };
  });
}

// Extract a short, single-line title from a free-text reason. Stops at
// the first sentence end if there is one within ~60 chars, otherwise
// truncates with an ellipsis.
function shortTitleFromReason(reason: string): string {
  const cleaned = reason.trim();
  if (!cleaned) return '';
  if (cleaned.length <= 50) return cleaned;
  const sentenceEnd = cleaned.search(/[.!?](\s|$)/);
  if (sentenceEnd > 0 && sentenceEnd < 60) {
    return cleaned.slice(0, sentenceEnd + 1).trim();
  }
  return cleaned.slice(0, 47).trimEnd() + '…';
}
