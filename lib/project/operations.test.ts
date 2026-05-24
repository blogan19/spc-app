import { beforeEach, describe, expect, it } from 'vitest';
import {
  abandonPDSACycle,
  addChildNode,
  addIshikawaCategory,
  addIshikawaCause,
  addPDSACycle,
  addPrimaryDriver,
  addProcessStep,
  completePDSACycle,
  composeAimSentence,
  ensureDriverDiagram,
  ensureIshikawaDiagram,
  ensureProcessMap,
  moveProcessStep,
  removeDriverNode,
  removeIshikawaCategory,
  removeIshikawaCause,
  removePDSACycle,
  removeProcessStep,
  setIshikawaProblem,
  setProcessMapDescription,
  setProcessMapTitle,
  startPDSADo,
  startPDSAStudy,
  updateAim,
  updateDriverNode,
  updateIshikawaCategory,
  updateIshikawaCause,
  updatePDSACycle,
  updateProcessStep,
} from './operations';
import { createSeedProject } from './seed';
import type { DriverDiagram, PDSACycle, Project } from './types';

let project: Project;
beforeEach(() => {
  project = createSeedProject();
});

describe('composeAimSentence', () => {
  it('falls back to free-text when no structured fields are set', () => {
    expect(composeAimSentence({ text: 'Make things better.' })).toBe('Make things better.');
  });

  it('returns empty string when nothing is set', () => {
    expect(composeAimSentence({})).toBe('');
  });

  it('composes a sentence from structured fields', () => {
    const sentence = composeAimSentence({
      direction: 'decrease',
      metric: 'average A&E wait time',
      population: 'adult patients',
      magnitude: 'below 4 hours',
      deadline: 'Q4 2026',
    });
    expect(sentence).toBe(
      'Reduce average A&E wait time for adult patients below 4 hours by Q4 2026.',
    );
  });

  it('handles "increase" and "maintain" verbs', () => {
    expect(composeAimSentence({ direction: 'increase', metric: 'compliance' })).toContain(
      'Increase compliance',
    );
    expect(composeAimSentence({ direction: 'maintain', metric: 'flow' })).toContain(
      'Maintain flow',
    );
  });

  it('inserts "to" only when the magnitude does not start with a known preposition', () => {
    expect(
      composeAimSentence({ direction: 'decrease', metric: 'falls', magnitude: '20%' }),
    ).toContain('to 20%');
    expect(
      composeAimSentence({ direction: 'decrease', metric: 'falls', magnitude: 'by 20%' }),
    ).toContain('by 20%');
  });
});

describe('updateAim', () => {
  it('merges partial patches without erasing other fields', () => {
    project = updateAim(project, { metric: 'wait time', direction: 'decrease' });
    project = updateAim(project, { deadline: 'March 2026' });
    expect(project.aim.metric).toBe('wait time');
    expect(project.aim.deadline).toBe('March 2026');
    expect(project.aim.direction).toBe('decrease');
  });
});

describe('driver diagram operations', () => {
  it('ensures the diagram exists on first access', () => {
    expect(project.driverDiagram).toBeNull();
    const { project: next, diagram } = ensureDriverDiagram(project);
    expect(next.driverDiagram).not.toBeNull();
    expect(diagram.primaryDrivers).toEqual([]);
    // Idempotent — second call returns the same diagram.
    const again = ensureDriverDiagram(next);
    expect(again.diagram.id).toBe(diagram.id);
  });

  it('adds a primary driver at the top level', () => {
    let diagram: DriverDiagram = { id: 'd', primaryDrivers: [] };
    diagram = addPrimaryDriver(diagram, 'Triage process');
    expect(diagram.primaryDrivers).toHaveLength(1);
    expect(diagram.primaryDrivers[0]).toMatchObject({ label: 'Triage process', type: 'primary' });
  });

  it('adds a secondary driver under a primary, and a change idea under that', () => {
    let diagram: DriverDiagram = { id: 'd', primaryDrivers: [] };
    diagram = addPrimaryDriver(diagram, 'Triage');
    const primaryId = diagram.primaryDrivers[0].id;
    diagram = addChildNode(diagram, primaryId, 'Standardise criteria');
    const secondaryId = diagram.primaryDrivers[0].children[0].id;
    expect(diagram.primaryDrivers[0].children[0].type).toBe('secondary');

    diagram = addChildNode(diagram, secondaryId, 'Adopt MTS');
    const leaf = diagram.primaryDrivers[0].children[0].children[0];
    expect(leaf.type).toBe('change-idea');
    expect(leaf.label).toBe('Adopt MTS');
  });

  it('refuses to add a child to a change-idea leaf', () => {
    let diagram: DriverDiagram = { id: 'd', primaryDrivers: [] };
    diagram = addPrimaryDriver(diagram, 'P');
    diagram = addChildNode(diagram, diagram.primaryDrivers[0].id, 'S');
    diagram = addChildNode(
      diagram,
      diagram.primaryDrivers[0].children[0].id,
      'CI',
    );
    const leafId = diagram.primaryDrivers[0].children[0].children[0].id;
    const before = JSON.stringify(diagram);
    const after = addChildNode(diagram, leafId, 'Should be ignored');
    expect(JSON.stringify(after)).toBe(before);
  });

  it('updates a node label or measure link in place', () => {
    let diagram: DriverDiagram = { id: 'd', primaryDrivers: [] };
    diagram = addPrimaryDriver(diagram, 'P');
    const primaryId = diagram.primaryDrivers[0].id;
    diagram = updateDriverNode(diagram, primaryId, { label: 'P (renamed)' });
    expect(diagram.primaryDrivers[0].label).toBe('P (renamed)');

    diagram = addChildNode(diagram, primaryId, 'S');
    diagram = addChildNode(diagram, diagram.primaryDrivers[0].children[0].id, 'CI');
    const leafId = diagram.primaryDrivers[0].children[0].children[0].id;
    diagram = updateDriverNode(diagram, leafId, { measureId: 'm-1' });
    expect(diagram.primaryDrivers[0].children[0].children[0].measureId).toBe('m-1');
  });

  it('removes a node and any descendants', () => {
    let diagram: DriverDiagram = { id: 'd', primaryDrivers: [] };
    diagram = addPrimaryDriver(diagram, 'P1');
    diagram = addPrimaryDriver(diagram, 'P2');
    diagram = addChildNode(diagram, diagram.primaryDrivers[0].id, 'S');
    diagram = removeDriverNode(diagram, diagram.primaryDrivers[0].id);
    expect(diagram.primaryDrivers).toHaveLength(1);
    expect(diagram.primaryDrivers[0].label).toBe('P2');
  });
});

describe('PDSA cycle operations', () => {
  const findCycle = (p: Project, id: string): PDSACycle =>
    p.pdsaCycles.find((c) => c.id === id)!;

  it('creates a cycle in planning status with everything blank', () => {
    const { project: next, cycleId } = addPDSACycle(project, 'Cycle 1: Triage');
    const cycle = findCycle(next, cycleId);
    expect(cycle.status).toBe('planning');
    expect(cycle.predictionLockedAt).toBeNull();
    expect(cycle.title).toBe('Cycle 1: Triage');
    expect(cycle.prediction).toBe('');
  });

  it('auto-titles a cycle when no title is given', () => {
    const r1 = addPDSACycle(project, '');
    expect(findCycle(r1.project, r1.cycleId).title).toBe('Cycle 1');
    const r2 = addPDSACycle(r1.project, '   ');
    expect(findCycle(r2.project, r2.cycleId).title).toBe('Cycle 2');
  });

  it('locks the prediction the moment Do starts', () => {
    let { project: next, cycleId } = addPDSACycle(project, 'C');
    next = updatePDSACycle(next, cycleId, { prediction: 'Reduce by 15%' });
    next = startPDSADo(next, cycleId);

    const cycle = findCycle(next, cycleId);
    expect(cycle.status).toBe('in-progress');
    expect(cycle.predictionLockedAt).not.toBeNull();
    expect(cycle.prediction).toBe('Reduce by 15%');

    // Try to rewrite the prediction after lock — it must not change.
    next = updatePDSACycle(next, cycleId, { prediction: 'Reduce by 5%' });
    expect(findCycle(next, cycleId).prediction).toBe('Reduce by 15%');
  });

  it('still allows non-prediction fields to be edited after lock', () => {
    let { project: next, cycleId } = addPDSACycle(project, 'C');
    next = startPDSADo(next, cycleId);
    next = updatePDSACycle(next, cycleId, { doNotes: 'team briefed' });
    expect(findCycle(next, cycleId).doNotes).toBe('team briefed');
  });

  it('only allows startDo from planning', () => {
    const { project: a, cycleId } = addPDSACycle(project, 'C');
    const b = startPDSADo(a, cycleId);
    const c = startPDSADo(b, cycleId);
    // Second startDo is a no-op because status is no longer 'planning'.
    expect(findCycle(c, cycleId).status).toBe('in-progress');
    expect(findCycle(c, cycleId).predictionLockedAt).toBe(
      findCycle(b, cycleId).predictionLockedAt,
    );
  });

  it('runs the full happy-path state machine', () => {
    let { project: p, cycleId } = addPDSACycle(project, 'C');
    p = updatePDSACycle(p, cycleId, { question: 'Q', prediction: 'P' });
    p = startPDSADo(p, cycleId);
    expect(findCycle(p, cycleId).status).toBe('in-progress');
    p = startPDSAStudy(p, cycleId);
    expect(findCycle(p, cycleId).status).toBe('studying');
    p = updatePDSACycle(p, cycleId, { result: 'R' });
    p = completePDSACycle(p, cycleId, 'adapt');
    const final = findCycle(p, cycleId);
    expect(final.status).toBe('done');
    expect(final.decision).toBe('adapt');
  });

  it('refuses to complete a cycle that is not in studying', () => {
    const { project: a, cycleId } = addPDSACycle(project, 'C');
    const b = completePDSACycle(a, cycleId, 'adopt');
    // Still in planning — completion is a no-op.
    expect(findCycle(b, cycleId).status).toBe('planning');
    expect(findCycle(b, cycleId).decision).toBeNull();
  });

  it('lets a cycle be abandoned from any status', () => {
    const { project: a, cycleId } = addPDSACycle(project, 'C');
    expect(findCycle(abandonPDSACycle(a, cycleId), cycleId).status).toBe('abandoned');
    const b = startPDSADo(a, cycleId);
    expect(findCycle(abandonPDSACycle(b, cycleId), cycleId).status).toBe('abandoned');
  });

  it('removes a cycle entirely', () => {
    const { project: a, cycleId } = addPDSACycle(project, 'C');
    expect(a.pdsaCycles).toHaveLength(1);
    const b = removePDSACycle(a, cycleId);
    expect(b.pdsaCycles).toEqual([]);
  });
});

describe('Ishikawa operations', () => {
  it('initialises with 6 healthcare-friendly default categories', () => {
    const { diagram } = ensureIshikawaDiagram(project);
    expect(diagram.categories).toHaveLength(6);
    expect(diagram.categories.map((c) => c.label)).toEqual([
      'People',
      'Process',
      'Equipment',
      'Materials',
      'Environment',
      'Measurement',
    ]);
    expect(diagram.problem).toBe('');
  });

  it('is idempotent — second ensureIshikawaDiagram returns the same one', () => {
    const { project: a, diagram } = ensureIshikawaDiagram(project);
    const { diagram: again } = ensureIshikawaDiagram(a);
    expect(again.id).toBe(diagram.id);
  });

  it('sets the problem statement', () => {
    const { diagram } = ensureIshikawaDiagram(project);
    expect(setIshikawaProblem(diagram, 'High wait times').problem).toBe('High wait times');
  });

  it('adds and renames a category', () => {
    let { diagram } = ensureIshikawaDiagram(project);
    diagram = addIshikawaCategory(diagram, 'Patient factors');
    expect(diagram.categories).toHaveLength(7);
    const newId = diagram.categories[6].id;
    diagram = updateIshikawaCategory(diagram, newId, { label: 'Patient' });
    expect(diagram.categories[6].label).toBe('Patient');
  });

  it('removes a category and everything in it', () => {
    let { diagram } = ensureIshikawaDiagram(project);
    const peopleId = diagram.categories[0].id;
    diagram = addIshikawaCause(diagram, peopleId, 'Insufficient staff');
    diagram = removeIshikawaCategory(diagram, peopleId);
    expect(diagram.categories.find((c) => c.id === peopleId)).toBeUndefined();
  });

  it('adds, edits and removes causes under a category', () => {
    let { diagram } = ensureIshikawaDiagram(project);
    const processId = diagram.categories[1].id;
    diagram = addIshikawaCause(diagram, processId, 'No standard pathway');
    const causeId = diagram.categories[1].causes[0].id;
    diagram = updateIshikawaCause(diagram, causeId, 'No standard triage pathway');
    expect(diagram.categories[1].causes[0].label).toBe('No standard triage pathway');
    diagram = removeIshikawaCause(diagram, causeId);
    expect(diagram.categories[1].causes).toEqual([]);
  });

  it('leaves other categories alone when removing a cause', () => {
    let { diagram } = ensureIshikawaDiagram(project);
    const peopleId = diagram.categories[0].id;
    const processId = diagram.categories[1].id;
    diagram = addIshikawaCause(diagram, peopleId, 'A');
    diagram = addIshikawaCause(diagram, processId, 'B');
    const aId = diagram.categories[0].causes[0].id;
    diagram = removeIshikawaCause(diagram, aId);
    expect(diagram.categories[0].causes).toEqual([]);
    expect(diagram.categories[1].causes[0].label).toBe('B');
  });
});

describe('Process map operations', () => {
  it('creates an empty map on first access and is idempotent', () => {
    const { project: a, map: m1 } = ensureProcessMap(project);
    expect(a.processMap).not.toBeNull();
    expect(m1.steps).toEqual([]);
    const { map: m2 } = ensureProcessMap(a);
    expect(m2.id).toBe(m1.id);
  });

  it('sets title and description without disturbing the steps', () => {
    let { map } = ensureProcessMap(project);
    map = addProcessStep(map, { label: 'Begin', type: 'start' });
    map = setProcessMapTitle(map, 'A&E flow');
    map = setProcessMapDescription(map, 'Adult attendances');
    expect(map.title).toBe('A&E flow');
    expect(map.description).toBe('Adult attendances');
    expect(map.steps).toHaveLength(1);
  });

  it('adds steps in order, generating ids', () => {
    let { map } = ensureProcessMap(project);
    map = addProcessStep(map, { label: 'Start', type: 'start' });
    map = addProcessStep(map, { label: 'Triage', type: 'action', role: 'Triage RN' });
    map = addProcessStep(map, { label: 'Discharge', type: 'end' });
    expect(map.steps.map((s) => s.label)).toEqual(['Start', 'Triage', 'Discharge']);
    expect(map.steps[1].role).toBe('Triage RN');
    expect(new Set(map.steps.map((s) => s.id)).size).toBe(3);
  });

  it('updates a step in place', () => {
    let { map } = ensureProcessMap(project);
    map = addProcessStep(map, { label: 'X', type: 'action' });
    const sid = map.steps[0].id;
    map = updateProcessStep(map, sid, { label: 'Triage assessment', role: 'Triage RN' });
    expect(map.steps[0].label).toBe('Triage assessment');
    expect(map.steps[0].role).toBe('Triage RN');
    expect(map.steps[0].type).toBe('action');
  });

  it('removes a step by id', () => {
    let { map } = ensureProcessMap(project);
    map = addProcessStep(map, { label: 'A', type: 'action' });
    map = addProcessStep(map, { label: 'B', type: 'action' });
    const aId = map.steps[0].id;
    map = removeProcessStep(map, aId);
    expect(map.steps.map((s) => s.label)).toEqual(['B']);
  });

  it('moves a step up and down with bounds-checking', () => {
    let { map } = ensureProcessMap(project);
    map = addProcessStep(map, { label: 'A', type: 'action' });
    map = addProcessStep(map, { label: 'B', type: 'action' });
    map = addProcessStep(map, { label: 'C', type: 'action' });
    const bId = map.steps[1].id;
    map = moveProcessStep(map, bId, 'up');
    expect(map.steps.map((s) => s.label)).toEqual(['B', 'A', 'C']);
    map = moveProcessStep(map, bId, 'up');
    // Already at top — no-op.
    expect(map.steps.map((s) => s.label)).toEqual(['B', 'A', 'C']);
    map = moveProcessStep(map, bId, 'down');
    expect(map.steps.map((s) => s.label)).toEqual(['A', 'B', 'C']);
  });
});
