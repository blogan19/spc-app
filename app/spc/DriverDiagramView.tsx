'use client'
// Driver-diagram editor. Renders Aim → Primary → Secondary → Change idea
// as nested cards. Each level supports inline rename, add-child, and
// delete. Change ideas can be linked to a measure so the diagram and
// the data stay connected.

import { useMemo, useState } from 'react';
import { composeAimSentence } from '@/lib/project/operations';
import type {
  DriverDiagram,
  DriverNode,
  DriverNodeType,
  Measure,
  Project,
} from '@/lib/project/types';

interface Props {
  project: Project;
  onCreate: () => void;
  onAddPrimary: (label: string) => void;
  onAddChild: (parentId: string, label: string) => void;
  onUpdateNode: (
    nodeId: string,
    patch: Partial<Pick<DriverNode, 'label' | 'measureId' | 'linkedIncidentType'>>,
  ) => void;
  onRemoveNode: (nodeId: string) => void;
}

export default function DriverDiagramView({
  project,
  onCreate,
  onAddPrimary,
  onAddChild,
  onUpdateNode,
  onRemoveNode,
}: Props) {
  const diagram = project.driverDiagram;
  const aimSentence = composeAimSentence(project.aim);

  // Unique incident types in the imported dataset, sorted alphabetically.
  // Empty when no dataset has been imported — the picker then doesn't render.
  const incidentTypes = useMemo(() => {
    const set = new Set<string>();
    for (const inc of project.incidentDataset?.incidents ?? []) {
      const t = (inc.type ?? '').trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [project.incidentDataset]);

  if (!diagram) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-base font-medium text-gray-900 mb-1">No driver diagram yet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Start with your aim, then add the primary drivers — the high-level factors that
          influence the outcome.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Create driver diagram
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <span className="text-xs uppercase tracking-wide text-blue-700">Aim</span>
        <p className="text-sm text-blue-900 mt-1">
          {aimSentence || (
            <span className="italic text-blue-700/70">
              Set the project aim on the Measures tab.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {diagram.primaryDrivers.map((primary) => (
          <PrimaryDriverCard
            key={primary.id}
            primary={primary}
            measures={project.measures}
            incidentTypes={incidentTypes}
            onAddChild={onAddChild}
            onUpdateNode={onUpdateNode}
            onRemoveNode={onRemoveNode}
          />
        ))}
        <AddNodeButton
          label="Add primary driver"
          onAdd={onAddPrimary}
          placeholder="e.g. Triage process"
        />
      </div>
    </div>
  );
}

function PrimaryDriverCard({
  primary,
  measures,
  incidentTypes,
  onAddChild,
  onUpdateNode,
  onRemoveNode,
}: {
  primary: DriverNode;
  measures: Measure[];
  incidentTypes: string[];
  onAddChild: Props['onAddChild'];
  onUpdateNode: Props['onUpdateNode'];
  onRemoveNode: Props['onRemoveNode'];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <NodeLabel node={primary} type="primary" onUpdateNode={onUpdateNode} />
        <button
          type="button"
          onClick={() => onRemoveNode(primary.id)}
          className="text-xs text-red-600 hover:underline"
          title="Remove this primary driver and everything below it"
        >
          Remove
        </button>
      </div>
      <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-2">
        {primary.children.map((secondary) => (
          <SecondaryDriverCard
            key={secondary.id}
            secondary={secondary}
            measures={measures}
            incidentTypes={incidentTypes}
            onAddChild={onAddChild}
            onUpdateNode={onUpdateNode}
            onRemoveNode={onRemoveNode}
          />
        ))}
        <AddNodeButton
          label="Add secondary driver"
          onAdd={(label) => onAddChild(primary.id, label)}
          placeholder="e.g. Standardise triage criteria"
        />
      </div>
    </div>
  );
}

function SecondaryDriverCard({
  secondary,
  measures,
  incidentTypes,
  onAddChild,
  onUpdateNode,
  onRemoveNode,
}: {
  secondary: DriverNode;
  measures: Measure[];
  incidentTypes: string[];
  onAddChild: Props['onAddChild'];
  onUpdateNode: Props['onUpdateNode'];
  onRemoveNode: Props['onRemoveNode'];
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-2">
      <div className="flex items-start justify-between gap-3">
        <NodeLabel node={secondary} type="secondary" onUpdateNode={onUpdateNode} />
        <button
          type="button"
          onClick={() => onRemoveNode(secondary.id)}
          className="text-xs text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
      <ul className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
        {secondary.children.map((idea) => (
          <li key={idea.id} className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-400">→</span>
            <NodeLabel node={idea} type="change-idea" onUpdateNode={onUpdateNode} compact />
            <MeasureLink
              node={idea}
              measures={measures}
              onUpdateNode={onUpdateNode}
            />
            {idea.measureId && incidentTypes.length > 0 && (
              <IncidentTypeLink
                node={idea}
                incidentTypes={incidentTypes}
                onUpdateNode={onUpdateNode}
              />
            )}
            <button
              type="button"
              onClick={() => onRemoveNode(idea.id)}
              className="text-xs text-red-600 hover:underline ml-auto"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="pl-4 mt-1">
        <AddNodeButton
          label="Add change idea"
          onAdd={(label) => onAddChild(secondary.id, label)}
          placeholder="e.g. Adopt MTS criteria"
          compact
        />
      </div>
    </div>
  );
}

function NodeLabel({
  node,
  type,
  onUpdateNode,
  compact,
}: {
  node: DriverNode;
  type: DriverNodeType;
  onUpdateNode: Props['onUpdateNode'];
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={node.label}
        onBlur={(e) => {
          onUpdateNode(node.id, { label: e.target.value });
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        className="border border-blue-300 rounded px-1 py-0.5 text-sm flex-1"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={
        compact
          ? 'text-sm text-gray-800 text-left hover:underline'
          : type === 'primary'
            ? 'text-base font-semibold text-gray-900 text-left hover:underline'
            : 'text-sm font-medium text-gray-800 text-left hover:underline'
      }
      title="Click to rename"
    >
      {node.label}
    </button>
  );
}

function MeasureLink({
  node,
  measures,
  onUpdateNode,
}: {
  node: DriverNode;
  measures: Measure[];
  onUpdateNode: Props['onUpdateNode'];
}) {
  return (
    <select
      value={node.measureId ?? ''}
      onChange={(e) =>
        onUpdateNode(node.id, { measureId: e.target.value || undefined })
      }
      className="text-xs border border-gray-200 rounded px-1 py-0.5"
      title="Link this change idea to a measure"
    >
      <option value="">— link measure —</option>
      {measures.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

function IncidentTypeLink({
  node,
  incidentTypes,
  onUpdateNode,
}: {
  node: DriverNode;
  incidentTypes: string[];
  onUpdateNode: Props['onUpdateNode'];
}) {
  return (
    <select
      value={node.linkedIncidentType ?? ''}
      onChange={(e) =>
        onUpdateNode(node.id, {
          linkedIncidentType: e.target.value || undefined,
        })
      }
      className="text-xs border border-gray-200 rounded px-1 py-0.5"
      title="Auto-annotate the linked measure's chart with incidents of this type"
    >
      <option value="">— auto-annotate from —</option>
      {incidentTypes.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

function AddNodeButton({
  label,
  onAdd,
  placeholder,
  compact,
}: {
  label: string;
  onAdd: (text: string) => void;
  placeholder: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (v) onAdd(v);
    setText('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'text-xs text-blue-600 hover:underline'
            : 'text-sm text-blue-600 hover:underline'
        }
      >
        + {label}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setText('');
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={`border border-gray-300 rounded px-2 py-0.5 ${compact ? 'text-xs flex-1' : 'text-sm flex-1'}`}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        className={`${compact ? 'text-xs' : 'text-sm'} px-2 py-0.5 rounded bg-blue-600 text-white disabled:bg-gray-300`}
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setText('');
          setOpen(false);
        }}
        className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}
      >
        Cancel
      </button>
    </div>
  );
}
