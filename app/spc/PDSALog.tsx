'use client'
// PDSA log — Plan/Do/Study/Act per cycle, with status state machine.
// Prediction locks on "Start Do" (enforced in operations); the UI mirrors
// this with a read-only prediction field once status > planning.

import { useMemo, useState } from 'react';
import type {
  DriverDiagram,
  DriverNode,
  Measure,
  PDSACycle,
  PDSADecision,
  PDSAStatus,
  Project,
} from '@/lib/project/types';

interface Props {
  project: Project;
  onAddCycle: (title: string) => void;
  onUpdateCycle: (
    cycleId: string,
    patch: Partial<Omit<PDSACycle, 'id' | 'createdAt' | 'status' | 'predictionLockedAt'>>,
  ) => void;
  onStartDo: (cycleId: string) => void;
  onStartStudy: (cycleId: string) => void;
  onComplete: (cycleId: string, decision: PDSADecision) => void;
  onAbandon: (cycleId: string) => void;
  onRemove: (cycleId: string) => void;
}

export default function PDSALog({
  project,
  onAddCycle,
  onUpdateCycle,
  onStartDo,
  onStartStudy,
  onComplete,
  onAbandon,
  onRemove,
}: Props) {
  const changeIdeas = useMemo(
    () => (project.driverDiagram ? listChangeIdeas(project.driverDiagram) : []),
    [project.driverDiagram],
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-gray-900">PDSA log</h2>
          <p className="text-sm text-gray-600">
            One cycle per test of change. Predictions lock when you start "Do" — that's the
            point.
          </p>
        </div>
        <AddCycleButton
          defaultTitle={`Cycle ${project.pdsaCycles.length + 1}`}
          onAdd={onAddCycle}
        />
      </header>

      {project.pdsaCycles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-600">
          No PDSA cycles yet. Start one to test a change idea.
        </div>
      ) : (
        <ul className="space-y-3">
          {project.pdsaCycles.map((cycle) => (
            <li key={cycle.id}>
              <CycleCard
                cycle={cycle}
                measures={project.measures}
                changeIdeas={changeIdeas}
                onUpdate={(patch) => onUpdateCycle(cycle.id, patch)}
                onStartDo={() => onStartDo(cycle.id)}
                onStartStudy={() => onStartStudy(cycle.id)}
                onComplete={(decision) => onComplete(cycle.id, decision)}
                onAbandon={() => onAbandon(cycle.id)}
                onRemove={() => onRemove(cycle.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddCycleButton({
  defaultTitle,
  onAdd,
}: {
  defaultTitle: string;
  onAdd: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTitle('');
        }}
        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
      >
        + New PDSA cycle
      </button>
    );
  }
  const submit = () => {
    onAdd(title);
    setOpen(false);
  };
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={defaultTitle}
        className="border border-gray-300 rounded px-2 py-1 text-sm w-56"
      />
      <button
        type="button"
        onClick={submit}
        className="text-sm px-3 py-1 rounded bg-blue-600 text-white"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-gray-500"
      >
        Cancel
      </button>
    </div>
  );
}

interface ChangeIdeaOption {
  id: string;
  path: string;
}

function listChangeIdeas(diagram: DriverDiagram): ChangeIdeaOption[] {
  const out: ChangeIdeaOption[] = [];
  for (const primary of diagram.primaryDrivers) {
    for (const secondary of primary.children) {
      for (const idea of secondary.children) {
        out.push({
          id: idea.id,
          path: `${primary.label} → ${secondary.label} → ${idea.label}`,
        });
      }
    }
  }
  return out;
}

function CycleCard({
  cycle,
  measures,
  changeIdeas,
  onUpdate,
  onStartDo,
  onStartStudy,
  onComplete,
  onAbandon,
  onRemove,
}: {
  cycle: PDSACycle;
  measures: Measure[];
  changeIdeas: ChangeIdeaOption[];
  onUpdate: (patch: Partial<Omit<PDSACycle, 'id' | 'createdAt' | 'status' | 'predictionLockedAt'>>) => void;
  onStartDo: () => void;
  onStartStudy: () => void;
  onComplete: (decision: PDSADecision) => void;
  onAbandon: () => void;
  onRemove: () => void;
}) {
  const isLocked = Boolean(cycle.predictionLockedAt);
  const showDo = cycle.status !== 'planning';
  const showStudy =
    cycle.status === 'studying' || cycle.status === 'done' || cycle.status === 'abandoned';
  const showAct = cycle.status === 'studying' || cycle.status === 'done';

  return (
    <div
      className={`border rounded-lg bg-white ${
        cycle.status === 'abandoned' ? 'border-gray-200 opacity-60' : 'border-gray-300'
      }`}
    >
      <header className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1">
          <EditableLabel
            value={cycle.title}
            onCommit={(v) => onUpdate({ title: v })}
            className="text-base font-semibold text-gray-900"
          />
          <StatusPill status={cycle.status} />
        </div>
        <div className="flex items-center gap-3">
          {cycle.status !== 'done' && cycle.status !== 'abandoned' && (
            <button
              type="button"
              onClick={onAbandon}
              className="text-xs text-gray-500 hover:text-red-600 hover:underline"
            >
              Abandon
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <Section title="Plan">
          <Field label="Question">
            <textarea
              value={cycle.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              rows={2}
              placeholder="What are we trying to learn?"
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
          <Field
            label={
              <>
                Prediction{' '}
                {isLocked && (
                  <span className="text-xs text-blue-700">
                    🔒 locked {cycle.predictionLockedAt?.substring(0, 10)}
                  </span>
                )}
              </>
            }
          >
            <textarea
              value={cycle.prediction}
              onChange={(e) => onUpdate({ prediction: e.target.value })}
              readOnly={isLocked}
              rows={2}
              placeholder="What do you think will happen?"
              className={`border border-gray-300 rounded px-2 py-1 w-full ${
                isLocked ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </Field>
          <Field label="Linked measure">
            <select
              value={cycle.linkedMeasureId ?? ''}
              onChange={(e) =>
                onUpdate({ linkedMeasureId: e.target.value || undefined })
              }
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="">— none —</option>
              {measures.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Linked change idea">
            <select
              value={cycle.linkedChangeIdeaId ?? ''}
              onChange={(e) =>
                onUpdate({ linkedChangeIdeaId: e.target.value || undefined })
              }
              className="border border-gray-300 rounded px-2 py-1 w-full text-xs"
            >
              <option value="">— none —</option>
              {changeIdeas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Do" muted={!showDo}>
          {showDo ? (
            <>
              <Field label="Start date">
                <input
                  type="date"
                  value={cycle.startDate}
                  onChange={(e) => onUpdate({ startDate: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </Field>
              <Field label="Notes from running the change">
                <textarea
                  value={cycle.doNotes}
                  onChange={(e) => onUpdate({ doNotes: e.target.value })}
                  rows={3}
                  placeholder="What actually happened? Surprises? Workarounds?"
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </Field>
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Hit "Start Do" once the team is ready to run the test. The prediction
              locks at that point.
            </p>
          )}
        </Section>

        <Section title="Study" muted={!showStudy}>
          {showStudy ? (
            <>
              <Field label="End date">
                <input
                  type="date"
                  value={cycle.endDate}
                  onChange={(e) => onUpdate({ endDate: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </Field>
              <Field label="Result">
                <textarea
                  value={cycle.result}
                  onChange={(e) => onUpdate({ result: e.target.value })}
                  rows={2}
                  placeholder="What did the data show?"
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </Field>
              {cycle.prediction && cycle.result && (
                <PredictionComparison
                  prediction={cycle.prediction}
                  result={cycle.result}
                />
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Visible once you start "Study".
            </p>
          )}
        </Section>

        <Section title="Act" muted={!showAct}>
          {showAct ? (
            <>
              <Field label="Decision">
                {cycle.status === 'done' ? (
                  <span className="text-base font-medium text-gray-900 capitalize">
                    {cycle.decision}
                  </span>
                ) : (
                  <div className="flex gap-2">
                    {(['adopt', 'adapt', 'abandon'] as PDSADecision[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onComplete(d)}
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 text-sm capitalize"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Act notes">
                <textarea
                  value={cycle.actNotes}
                  onChange={(e) => onUpdate({ actNotes: e.target.value })}
                  rows={2}
                  placeholder="What's the next cycle, or what's being adopted?"
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </Field>
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Available once you start "Study".
            </p>
          )}
        </Section>
      </div>

      <footer className="p-3 border-t border-gray-100 flex justify-end gap-2">
        {cycle.status === 'planning' && (
          <button
            type="button"
            onClick={onStartDo}
            disabled={!cycle.question.trim() || !cycle.prediction.trim()}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            title={
              !cycle.question.trim() || !cycle.prediction.trim()
                ? 'Question and prediction are required before starting Do'
                : 'Start running the test — this locks the prediction'
            }
          >
            Start Do → (locks prediction)
          </button>
        )}
        {cycle.status === 'in-progress' && (
          <button
            type="button"
            onClick={onStartStudy}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          >
            Start Study →
          </button>
        )}
      </footer>
    </div>
  );
}

function StatusPill({ status }: { status: PDSAStatus }) {
  const colours: Record<PDSAStatus, string> = {
    planning: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-800',
    studying: 'bg-amber-100 text-amber-800',
    done: 'bg-green-100 text-green-800',
    abandoned: 'bg-gray-200 text-gray-600',
  };
  const labels: Record<PDSAStatus, string> = {
    planning: 'Planning',
    'in-progress': 'In progress',
    studying: 'Studying',
    done: 'Done',
    abandoned: 'Abandoned',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${colours[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function Section({
  title,
  muted,
  children,
}: {
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-2 ${muted ? 'opacity-60' : ''}`}>
      <h3 className="text-xs uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-gray-600 mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function PredictionComparison({
  prediction,
  result,
}: {
  prediction: string;
  result: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-1">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
        Prediction vs result
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-500 mb-0.5">Predicted</p>
          <p className="text-gray-900">{prediction}</p>
        </div>
        <div>
          <p className="text-gray-500 mb-0.5">Observed</p>
          <p className="text-gray-900">{result}</p>
        </div>
      </div>
    </div>
  );
}

function EditableLabel({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={value}
        onBlur={(e) => {
          onCommit(e.target.value.trim() || value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="border border-blue-300 rounded px-1 py-0.5 text-base flex-1"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-left hover:underline ${className ?? ''}`}
      title="Click to rename"
    >
      {value}
    </button>
  );
}
