'use client'
// Process map: linear sequence of steps rendered top-to-bottom as an
// SVG flowchart, with an editable list of steps below. Shape varies by
// step type (start/end pill, action rectangle, decision diamond, wait
// parallelogram). Roles appear as small tags beside each shape.

import { useRef, useState } from 'react';
import type {
  ProcessMap,
  ProcessStep,
  ProcessStepType,
  Project,
} from '@/lib/project/types';

interface Props {
  project: Project;
  onCreate: () => void;
  onSetTitle: (title: string) => void;
  onSetDescription: (description: string) => void;
  onAddStep: (step: { label: string; type: ProcessStepType; role?: string }) => void;
  onUpdateStep: (stepId: string, patch: Partial<Omit<ProcessStep, 'id'>>) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: 'up' | 'down') => void;
}

const stepTypeLabels: Record<ProcessStepType, string> = {
  start: 'Start',
  action: 'Action',
  decision: 'Decision',
  wait: 'Wait',
  end: 'End',
};

export default function ProcessMapView({
  project,
  onCreate,
  onSetTitle,
  onSetDescription,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onMoveStep,
}: Props) {
  const map = project.processMap;
  if (!map) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-base font-medium text-gray-900 mb-1">No process map yet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Linear flowchart of the steps in the process you're improving. Each step is one of
          start / action / decision / wait / end and can carry a role and notes.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Create process map
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HeaderFields
        title={map.title}
        description={map.description ?? ''}
        onSetTitle={onSetTitle}
        onSetDescription={onSetDescription}
      />

      <Flowchart map={map} />

      <StepList
        steps={map.steps}
        onAddStep={onAddStep}
        onUpdateStep={onUpdateStep}
        onRemoveStep={onRemoveStep}
        onMoveStep={onMoveStep}
      />
    </div>
  );
}

function HeaderFields({
  title,
  description,
  onSetTitle,
  onSetDescription,
}: {
  title: string;
  description: string;
  onSetTitle: (s: string) => void;
  onSetDescription: (s: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Process title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => onSetTitle(e.target.value)}
          placeholder="e.g. Adult A&E attendance"
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Description (optional)
        </span>
        <textarea
          value={description}
          onChange={(e) => onSetDescription(e.target.value)}
          rows={2}
          placeholder="Scope, assumptions, time window"
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </label>
    </div>
  );
}

// --- Flowchart -----------------------------------------------------------

const SHAPE_W = 280;
const SHAPE_H = 56;
const ROLE_W = 130;
const STRIDE = 96; // distance between shape centres (shape height + arrow)
const PAD_TOP = 40;
const SVG_W = 660;

function Flowchart({ map }: { map: ProcessMap }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const svgHeight = PAD_TOP * 2 + Math.max(STRIDE, map.steps.length * STRIDE);

  const exportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SVG_W;
      canvas.height = svgHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement('a');
        const safe = (map.title || 'process-map').replace(/[^a-z0-9\-_]+/gi, '_');
        a.href = URL.createObjectURL(b);
        a.download = `${safe}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  };

  if (map.steps.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded p-6 text-center text-sm text-gray-500">
        No steps yet — add one below to start the flow.
      </div>
    );
  }

  const centreX = SVG_W / 2;

  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={exportPng}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Export PNG
        </button>
      </div>
      <svg
        ref={svgRef}
        width={SVG_W}
        height={svgHeight}
        className="block mx-auto border border-gray-200 rounded bg-white"
      >
        <rect width="100%" height="100%" fill="white" />
        <defs>
          <marker
            id="pm-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#374151" />
          </marker>
        </defs>
        {map.steps.map((step, i) => {
          const cy = PAD_TOP + i * STRIDE + SHAPE_H / 2;
          const prevCy = PAD_TOP + (i - 1) * STRIDE + SHAPE_H / 2;
          return (
            <g key={step.id}>
              {i > 0 && (
                <line
                  x1={centreX}
                  y1={prevCy + SHAPE_H / 2}
                  x2={centreX}
                  y2={cy - SHAPE_H / 2}
                  stroke="#374151"
                  strokeWidth={1.5}
                  markerEnd="url(#pm-arrow)"
                />
              )}
              <StepShape step={step} cx={centreX} cy={cy} />
              {step.role && <RoleTag x={centreX + SHAPE_W / 2 + 16} cy={cy} role={step.role} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StepShape({ step, cx, cy }: { step: ProcessStep; cx: number; cy: number }) {
  const fill = fillFor(step.type);
  const stroke = strokeFor(step.type);
  const label = step.label || stepTypeLabels[step.type];

  if (step.type === 'decision') {
    // Diamond: points top/right/bottom/left around (cx, cy).
    const w = SHAPE_W - 60;
    const h = SHAPE_H + 6;
    const points = [
      `${cx},${cy - h / 2}`,
      `${cx + w / 2},${cy}`,
      `${cx},${cy + h / 2}`,
      `${cx - w / 2},${cy}`,
    ].join(' ');
    return (
      <g>
        <polygon points={points} fill={fill} stroke={stroke} strokeWidth={1.5} />
        <StepLabel cx={cx} cy={cy} text={label} maxWidth={w - 20} />
      </g>
    );
  }
  if (step.type === 'wait') {
    // Parallelogram skewed to the right.
    const skew = 14;
    const x = cx - SHAPE_W / 2;
    const y = cy - SHAPE_H / 2;
    const points = [
      `${x + skew},${y}`,
      `${x + SHAPE_W},${y}`,
      `${x + SHAPE_W - skew},${y + SHAPE_H}`,
      `${x},${y + SHAPE_H}`,
    ].join(' ');
    return (
      <g>
        <polygon points={points} fill={fill} stroke={stroke} strokeWidth={1.5} />
        <StepLabel cx={cx} cy={cy} text={label} maxWidth={SHAPE_W - 30} />
      </g>
    );
  }
  // start / end use a pill (rx large); action uses a rounded rect (rx small).
  const isPill = step.type === 'start' || step.type === 'end';
  return (
    <g>
      <rect
        x={cx - SHAPE_W / 2}
        y={cy - SHAPE_H / 2}
        width={SHAPE_W}
        height={SHAPE_H}
        rx={isPill ? SHAPE_H / 2 : 6}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <StepLabel cx={cx} cy={cy} text={label} maxWidth={SHAPE_W - 20} />
    </g>
  );
}

function StepLabel({
  cx,
  cy,
  text,
  maxWidth,
}: {
  cx: number;
  cy: number;
  text: string;
  maxWidth: number;
}) {
  return (
    <foreignObject
      x={cx - maxWidth / 2}
      y={cy - SHAPE_H / 2}
      width={maxWidth}
      height={SHAPE_H}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontSize: 13,
          lineHeight: 1.15,
          textAlign: 'center',
          color: '#111827',
          padding: '0 4px',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
}

function RoleTag({ x, cy, role }: { x: number; cy: number; role: string }) {
  const w = ROLE_W;
  const h = 24;
  return (
    <g>
      <rect
        x={x}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={4}
        fill="#f3f4f6"
        stroke="#d1d5db"
      />
      <foreignObject x={x} y={cy - h / 2} width={w} height={h}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: 11,
            color: '#374151',
            padding: '0 4px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {role}
        </div>
      </foreignObject>
    </g>
  );
}

function fillFor(type: ProcessStepType): string {
  switch (type) {
    case 'start':
      return '#dcfce7';
    case 'end':
      return '#fee2e2';
    case 'decision':
      return '#fef3c7';
    case 'wait':
      return '#e0e7ff';
    default:
      return '#f3f4f6';
  }
}
function strokeFor(type: ProcessStepType): string {
  switch (type) {
    case 'start':
      return '#16a34a';
    case 'end':
      return '#dc2626';
    case 'decision':
      return '#d97706';
    case 'wait':
      return '#4f46e5';
    default:
      return '#9ca3af';
  }
}

// --- Step list editor ----------------------------------------------------

function StepList({
  steps,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onMoveStep,
}: {
  steps: ProcessStep[];
  onAddStep: Props['onAddStep'];
  onUpdateStep: Props['onUpdateStep'];
  onRemoveStep: Props['onRemoveStep'];
  onMoveStep: Props['onMoveStep'];
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Steps</h3>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={step.id}>
            <StepRow
              step={step}
              index={i}
              total={steps.length}
              onUpdate={(patch) => onUpdateStep(step.id, patch)}
              onRemove={() => onRemoveStep(step.id)}
              onMoveUp={() => onMoveStep(step.id, 'up')}
              onMoveDown={() => onMoveStep(step.id, 'down')}
            />
          </li>
        ))}
      </ul>
      <AddStepRow onAdd={onAddStep} />
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ProcessStep;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Omit<ProcessStep, 'id'>>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col text-xs text-gray-500 mt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="hover:text-gray-700 disabled:text-gray-300"
            title="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="hover:text-gray-700 disabled:text-gray-300"
            title="Move down"
          >
            ▼
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
          <select
            value={step.type}
            onChange={(e) =>
              onUpdate({ type: e.target.value as ProcessStepType })
            }
            className="sm:col-span-2 border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {(Object.keys(stepTypeLabels) as ProcessStepType[]).map((t) => (
              <option key={t} value={t}>
                {stepTypeLabels[t]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={step.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Step label"
            className="sm:col-span-6 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={step.role ?? ''}
            onChange={(e) => onUpdate({ role: e.target.value || undefined })}
            placeholder="Role (optional)"
            className="sm:col-span-4 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <textarea
            value={step.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
            rows={1}
            placeholder="Notes"
            className="sm:col-span-12 border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
          title="Remove this step"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function AddStepRow({ onAdd }: { onAdd: Props['onAddStep'] }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ProcessStepType>('action');
  const [role, setRole] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        + Add step
      </button>
    );
  }
  const submit = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), type, role: role.trim() || undefined });
    setLabel('');
    setRole('');
    setType('action');
    setOpen(false);
  };
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded p-3 flex items-center gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ProcessStepType)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      >
        {(Object.keys(stepTypeLabels) as ProcessStepType[]).map((t) => (
          <option key={t} value={t}>
            {stepTypeLabels[t]}
          </option>
        ))}
      </select>
      <input
        autoFocus
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Step label"
        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Role (optional)"
        className="w-40 border border-gray-300 rounded px-2 py-1 text-sm"
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
