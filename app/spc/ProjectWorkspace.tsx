'use client'
// The project-level shell: header, aim editor, top-level view tabs, and
// the active view content. All Project mutation lives here — child
// components are dumb and call scoped callbacks.

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import MeasureView from './MeasureView';
import CompareView from './CompareView';
import AimEditor from './AimEditor';
import DriverDiagramView from './DriverDiagramView';
import PDSALog from './PDSALog';
import IshikawaView from './IshikawaView';
import ProcessMapView from './ProcessMapView';
import IncidentsView from './IncidentsView';
import CorrelationView from './CorrelationView';
import {
  clearIncidents,
  setIncidents,
  setLocationDenominator,
} from '@/lib/project/incidents';
import {
  abandonPDSACycle,
  addChildNode,
  addEmptyRow,
  addIshikawaCategory,
  addIshikawaCause,
  addMeasure,
  addPDSACycle,
  addPrimaryDriver,
  addProcessStep,
  completePDSACycle,
  ensureDriverDiagram,
  ensureIshikawaDiagram,
  ensureProcessMap,
  moveProcessStep,
  removeDriverNode,
  removeIshikawaCategory,
  removeIshikawaCause,
  removePDSACycle,
  removeProcessStep,
  setDriverDiagram,
  setIshikawaDiagram,
  setIshikawaProblem,
  setMeasureRows,
  setMeasureSetup,
  setProcessMap,
  setProcessMapDescription,
  setProcessMapTitle,
  setRowRecalculation,
  startPDSADo,
  startPDSAStudy,
  updateAim,
  updateDriverNode,
  updateIshikawaCategory,
  updateIshikawaCause,
  updateMeasureMeta,
  updateMeasureSettings,
  updatePDSACycle,
  updateProcessStep,
  updateProjectName,
  updateRowField,
  type RowField,
} from '@/lib/project/operations';
import type {
  AimStatement,
  ChartSettings,
  DriverDiagram,
  DriverNode,
  Project,
  RecalcJustification,
} from '@/lib/project/types';

type ProjectView =
  | 'measures'
  | 'compare'
  | 'drivers'
  | 'pdsa'
  | 'ishikawa'
  | 'process'
  | 'incidents'
  | 'correlation';

interface Props {
  project: Project;
  setProject: (p: Project) => void;
  activeMeasureId: string;
  setActiveMeasureId: (id: string) => void;
  // Optional UI slot rendered on the right of the top nav (e.g. the
  // save-status indicator when running inside /projects/[id]).
  navRight?: ReactNode;
  // When true, the top-left brand becomes a link back to /projects.
  // Off in standalone/free usage where there's no projects list to
  // return to.
  showBackToProjects?: boolean;
  // When true, mutation callbacks are accepted but discarded — the
  // share-link route uses this so visitors can navigate / inspect the
  // project without affecting it.
  readOnly?: boolean;
}

export default function ProjectWorkspace({
  project,
  setProject,
  activeMeasureId,
  setActiveMeasureId,
  navRight,
  showBackToProjects,
  readOnly,
}: Props) {
  // readOnly is wired up at the prop boundary — the parent for the
  // share-link route passes a no-op setProject, which already prevents
  // edits from persisting. This flag drives optional UI tweaks (banner,
  // disabled actions).
  void readOnly;
  const [view, setView] = useState<ProjectView>('measures');
  const activeMeasure = project.measures.find((m) => m.id === activeMeasureId);

  const onAddMeasure = () => {
    const defaultName = `Measure ${project.measures.length + 1}`;
    const { project: next, measureId } = addMeasure(project, defaultName);
    setProject(next);
    setActiveMeasureId(measureId);
  };

  // Driver-diagram callbacks operate on the diagram (creating it on
  // demand) and write the result back to the project.
  const mutateDiagram = (mutate: (d: DriverDiagram) => DriverDiagram) => {
    const { project: ensured, diagram } = ensureDriverDiagram(project);
    setProject(setDriverDiagram(ensured, mutate(diagram)));
  };

  // Same pattern for the Ishikawa diagram.
  const mutateIshikawa = (
    mutate: (d: ReturnType<typeof ensureIshikawaDiagram>['diagram']) => ReturnType<
      typeof ensureIshikawaDiagram
    >['diagram'],
  ) => {
    const { project: ensured, diagram } = ensureIshikawaDiagram(project);
    setProject(setIshikawaDiagram(ensured, mutate(diagram)));
  };

  // And for the process map.
  const mutateProcessMap = (
    mutate: (m: ReturnType<typeof ensureProcessMap>['map']) => ReturnType<
      typeof ensureProcessMap
    >['map'],
  ) => {
    const { project: ensured, map } = ensureProcessMap(project);
    setProject(setProcessMap(ensured, mutate(map)));
  };

  return (
    <div>
      <nav className="relative px-3 sm:px-6 py-3 flex flex-wrap items-center bg-gray-50 border-b border-gray-200 gap-3 sm:gap-6">
        <Link
          href="/"
          className="font-semibold text-gray-900 hover:text-blue-700"
          title="Home"
        >
          SPC
        </Link>
        {showBackToProjects && (
          <Link
            href="/projects"
            className="text-sm text-gray-600 hover:text-blue-700"
          >
            ← Projects
          </Link>
        )}
        <input
          className="bg-transparent border-b border-gray-300 px-1 text-lg w-full sm:w-64"
          value={project.name}
          onChange={(e) => setProject(updateProjectName(project, e.target.value))}
          aria-label="Project name"
        />
        {navRight && <div className="ml-auto flex items-center gap-3">{navRight}</div>}
      </nav>

      <div className="px-6 mt-4">
        <AimEditor
          aim={project.aim}
          onUpdate={(patch: Partial<AimStatement>) =>
            setProject(updateAim(project, patch))
          }
        />
      </div>

      <div
        role="tablist"
        className="px-6 mt-4 border-b border-gray-200 flex items-center gap-2"
      >
        <ViewTab active={view === 'measures'} onClick={() => setView('measures')}>
          Measures
          <span className="ml-2 text-xs text-gray-400">{project.measures.length}</span>
        </ViewTab>
        <ViewTab active={view === 'compare'} onClick={() => setView('compare')}>
          Compare
        </ViewTab>
        <ViewTab active={view === 'drivers'} onClick={() => setView('drivers')}>
          Drivers
          {project.driverDiagram && (
            <span className="ml-2 text-xs text-gray-400">
              {project.driverDiagram.primaryDrivers.length}
            </span>
          )}
        </ViewTab>
        <ViewTab active={view === 'pdsa'} onClick={() => setView('pdsa')}>
          PDSA
          {project.pdsaCycles.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">{project.pdsaCycles.length}</span>
          )}
        </ViewTab>
        <ViewTab active={view === 'ishikawa'} onClick={() => setView('ishikawa')}>
          Cause & effect
        </ViewTab>
        <ViewTab active={view === 'process'} onClick={() => setView('process')}>
          Process map
        </ViewTab>
        <ViewTab active={view === 'incidents'} onClick={() => setView('incidents')}>
          Incidents
          {project.incidentDataset && (
            <span className="ml-2 text-xs text-gray-400">
              {project.incidentDataset.rowCount}
            </span>
          )}
        </ViewTab>
        <ViewTab active={view === 'correlation'} onClick={() => setView('correlation')}>
          Correlation
        </ViewTab>
      </div>

      {view === 'measures' ? (
        <MeasuresPane
          project={project}
          activeMeasureId={activeMeasureId}
          setActiveMeasureId={setActiveMeasureId}
          onAddMeasure={onAddMeasure}
          activeMeasure={activeMeasure}
          setProject={setProject}
        />
      ) : view === 'compare' ? (
        <div className="px-3 sm:px-6 mt-4 max-w-7xl mx-auto">
          <CompareView
            project={project}
            onOpenMeasure={(id) => {
              setActiveMeasureId(id);
              setView('measures');
            }}
          />
        </div>
      ) : view === 'drivers' ? (
        <div className="px-6 mt-4 max-w-4xl">
          <DriverDiagramView
            project={project}
            onCreate={() => {
              const { project: ensured } = ensureDriverDiagram(project);
              setProject(ensured);
            }}
            onAddPrimary={(label) =>
              mutateDiagram((d) => addPrimaryDriver(d, label))
            }
            onAddChild={(parentId, label) =>
              mutateDiagram((d) => addChildNode(d, parentId, label))
            }
            onUpdateNode={(nodeId, patch: Partial<Pick<DriverNode, 'label' | 'measureId'>>) =>
              mutateDiagram((d) => updateDriverNode(d, nodeId, patch))
            }
            onRemoveNode={(nodeId) =>
              mutateDiagram((d) => removeDriverNode(d, nodeId))
            }
          />
        </div>
      ) : view === 'pdsa' ? (
        <div className="px-6 mt-4 max-w-5xl">
          <PDSALog
            project={project}
            onAddCycle={(title) => {
              const { project: next } = addPDSACycle(project, title);
              setProject(next);
            }}
            onUpdateCycle={(cycleId, patch) =>
              setProject(updatePDSACycle(project, cycleId, patch))
            }
            onStartDo={(cycleId) => setProject(startPDSADo(project, cycleId))}
            onStartStudy={(cycleId) => setProject(startPDSAStudy(project, cycleId))}
            onComplete={(cycleId, decision) =>
              setProject(completePDSACycle(project, cycleId, decision))
            }
            onAbandon={(cycleId) => setProject(abandonPDSACycle(project, cycleId))}
            onRemove={(cycleId) => setProject(removePDSACycle(project, cycleId))}
          />
        </div>
      ) : view === 'ishikawa' ? (
        <div className="px-6 mt-4 max-w-5xl">
          <IshikawaView
            project={project}
            onCreate={() => {
              const { project: ensured } = ensureIshikawaDiagram(project);
              setProject(ensured);
            }}
            onSetProblem={(problem) =>
              mutateIshikawa((d) => setIshikawaProblem(d, problem))
            }
            onAddCategory={(label) =>
              mutateIshikawa((d) => addIshikawaCategory(d, label))
            }
            onUpdateCategory={(categoryId, label) =>
              mutateIshikawa((d) => updateIshikawaCategory(d, categoryId, { label }))
            }
            onRemoveCategory={(categoryId) =>
              mutateIshikawa((d) => removeIshikawaCategory(d, categoryId))
            }
            onAddCause={(categoryId, label) =>
              mutateIshikawa((d) => addIshikawaCause(d, categoryId, label))
            }
            onUpdateCause={(causeId, label) =>
              mutateIshikawa((d) => updateIshikawaCause(d, causeId, label))
            }
            onRemoveCause={(causeId) =>
              mutateIshikawa((d) => removeIshikawaCause(d, causeId))
            }
          />
        </div>
      ) : view === 'process' ? (
        <div className="px-6 mt-4 max-w-4xl">
          <ProcessMapView
            project={project}
            onCreate={() => {
              const { project: ensured } = ensureProcessMap(project);
              setProject(ensured);
            }}
            onSetTitle={(title) =>
              mutateProcessMap((m) => setProcessMapTitle(m, title))
            }
            onSetDescription={(d) =>
              mutateProcessMap((m) => setProcessMapDescription(m, d))
            }
            onAddStep={(step) => mutateProcessMap((m) => addProcessStep(m, step))}
            onUpdateStep={(stepId, patch) =>
              mutateProcessMap((m) => updateProcessStep(m, stepId, patch))
            }
            onRemoveStep={(stepId) =>
              mutateProcessMap((m) => removeProcessStep(m, stepId))
            }
            onMoveStep={(stepId, direction) =>
              mutateProcessMap((m) => moveProcessStep(m, stepId, direction))
            }
          />
        </div>
      ) : view === 'incidents' ? (
        <div className="px-6 mt-4 max-w-6xl">
          <IncidentsView
            project={project}
            onSetIncidents={(incidents) => setProject(setIncidents(project, incidents))}
            onClear={() => setProject(clearIncidents(project))}
            onSetLocationDenominator={(location, denominator) =>
              setProject(setLocationDenominator(project, location, denominator))
            }
          />
        </div>
      ) : (
        <div className="px-6 mt-4 max-w-5xl">
          <CorrelationView project={project} />
        </div>
      )}
    </div>
  );
}

function MeasuresPane({
  project,
  activeMeasureId,
  setActiveMeasureId,
  onAddMeasure,
  activeMeasure,
  setProject,
}: {
  project: Project;
  activeMeasureId: string;
  setActiveMeasureId: (id: string) => void;
  onAddMeasure: () => void;
  activeMeasure: Project['measures'][number] | undefined;
  setProject: (p: Project) => void;
}) {
  return (
    <>
      <div className="px-6 mt-3 flex items-center space-x-1 overflow-x-auto">
        {project.measures.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMeasureId(m.id)}
            className={`px-3 py-1.5 text-sm rounded-t ${
              m.id === activeMeasureId
                ? 'bg-gray-100 text-blue-700 font-medium border border-gray-200 border-b-transparent'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {m.name}
            <span className="ml-2 text-xs text-gray-400 uppercase tracking-wide">
              {m.type}
            </span>
          </button>
        ))}
        <button
          onClick={onAddMeasure}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600"
          title="Add a new measure"
        >
          + Measure
        </button>
      </div>

      {activeMeasure ? (
        <MeasureView
          measure={activeMeasure}
          project={project}
          onUpdateRowField={(rowIndex, field, value) =>
            setProject(
              updateRowField(project, activeMeasure.id, rowIndex, field as RowField, value),
            )
          }
          onAddRow={(date) => setProject(addEmptyRow(project, activeMeasure.id, date))}
          onSetRecalculation={(rowIndex, justification: RecalcJustification | null) =>
            setProject(setRowRecalculation(project, activeMeasure.id, rowIndex, justification))
          }
          onUpdateSettings={(patch: Partial<ChartSettings>) =>
            setProject(updateMeasureSettings(project, activeMeasure.id, patch))
          }
          onUpdateRows={(rows) => setProject(setMeasureRows(project, activeMeasure.id, rows))}
          onUpdateMeasureMeta={(patch) =>
            setProject(updateMeasureMeta(project, activeMeasure.id, patch))
          }
          onSetupMeasure={({ rows, increment, name, settings, chartKind, aim }) =>
            setProject(
              setMeasureSetup(project, activeMeasure.id, rows, increment, {
                name,
                settings,
                chartKind,
                aim,
              }),
            )
          }
        />
      ) : (
        <p className="px-6 py-10 text-gray-500">No measure selected.</p>
      )}
    </>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-700 -mb-px'
          : 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900'
      }
    >
      {children}
    </button>
  );
}
