'use client'
// Ishikawa (cause-and-effect / fishbone) diagram. SVG fishbone for the
// visual artefact + an editable category-column layout below for input.
// The SVG is the export target; PNG bakes the current state.

import { useRef, useState } from 'react';
import type {
  IshikawaCategory,
  IshikawaDiagram,
  Project,
} from '@/lib/project/types';

interface Props {
  project: Project;
  onCreate: () => void;
  onSetProblem: (problem: string) => void;
  onAddCategory: (label: string) => void;
  onUpdateCategory: (categoryId: string, label: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onAddCause: (categoryId: string, label: string) => void;
  onUpdateCause: (causeId: string, label: string) => void;
  onRemoveCause: (causeId: string) => void;
}

export default function IshikawaView({
  project,
  onCreate,
  onSetProblem,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onAddCause,
  onUpdateCause,
  onRemoveCause,
}: Props) {
  const diagram = project.ishikawa;
  if (!diagram) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-base font-medium text-gray-900 mb-1">
          No cause-and-effect diagram yet
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Start by writing the problem statement — what unwanted effect are you investigating?
          The diagram comes with six healthcare-flavoured default categories you can rename.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Create Ishikawa diagram
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProblemField problem={diagram.problem} onChange={onSetProblem} />

      <Fishbone diagram={diagram} />

      <CategoryColumns
        diagram={diagram}
        onAddCategory={onAddCategory}
        onUpdateCategory={onUpdateCategory}
        onRemoveCategory={onRemoveCategory}
        onAddCause={onAddCause}
        onUpdateCause={onUpdateCause}
        onRemoveCause={onRemoveCause}
      />
    </div>
  );
}

function ProblemField({
  problem,
  onChange,
}: {
  problem: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">
        Problem statement (the effect)
      </span>
      <textarea
        value={problem}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="e.g. Average A&E wait time has crept above 4 hours since September"
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      />
    </label>
  );
}

const FISHBONE_W = 900;
const FISHBONE_H = 460;
const SPINE_Y = 230;
const SPINE_X_START = 60;
const SPINE_X_END = 700;
const HEAD_X = 705;
const HEAD_W = 175;
const TOP_Y = 70;
const BOTTOM_Y = 390;

function Fishbone({ diagram }: { diagram: IshikawaDiagram }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const exportPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = FISHBONE_W;
      canvas.height = FISHBONE_H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ishikawa.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  };

  // Split categories: first half above the spine, second half below.
  // For a more typical fishbone arrangement when the count is odd, the
  // extra one goes on top.
  const half = Math.ceil(diagram.categories.length / 2);
  const topCats = diagram.categories.slice(0, half);
  const bottomCats = diagram.categories.slice(half);

  const attachXs = (count: number) => {
    if (count === 0) return [];
    const usable = SPINE_X_END - SPINE_X_START - 60;
    const step = count === 1 ? 0 : usable / (count - 1);
    return Array.from({ length: count }, (_, i) => SPINE_X_START + 30 + i * step);
  };

  const topAttachXs = attachXs(topCats.length);
  const bottomAttachXs = attachXs(bottomCats.length);

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
        width={FISHBONE_W}
        height={FISHBONE_H}
        className="block mx-auto border border-gray-200 rounded bg-white"
      >
        <rect width="100%" height="100%" fill="white" />

        {/* Spine */}
        <line
          x1={SPINE_X_START}
          y1={SPINE_Y}
          x2={SPINE_X_END}
          y2={SPINE_Y}
          stroke="#374151"
          strokeWidth={2}
        />
        {/* Arrowhead into the head */}
        <polygon
          points={`${SPINE_X_END},${SPINE_Y - 6} ${SPINE_X_END + 12},${SPINE_Y} ${SPINE_X_END},${SPINE_Y + 6}`}
          fill="#374151"
        />

        {/* Head box with problem text */}
        <rect
          x={HEAD_X}
          y={SPINE_Y - 35}
          width={HEAD_W}
          height={70}
          rx={6}
          fill="#1f2937"
        />
        <foreignObject
          x={HEAD_X + 6}
          y={SPINE_Y - 30}
          width={HEAD_W - 12}
          height={60}
        >
          <div
            style={{
              color: 'white',
              fontSize: 12,
              lineHeight: 1.2,
              textAlign: 'center',
              fontWeight: 600,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {diagram.problem.trim() || 'Effect / problem'}
          </div>
        </foreignObject>

        {/* Top bones */}
        {topCats.map((cat, i) => (
          <Bone
            key={cat.id}
            category={cat}
            attachX={topAttachXs[i]}
            tipY={TOP_Y}
            above
          />
        ))}
        {/* Bottom bones */}
        {bottomCats.map((cat, i) => (
          <Bone
            key={cat.id}
            category={cat}
            attachX={bottomAttachXs[i]}
            tipY={BOTTOM_Y}
            above={false}
          />
        ))}
      </svg>
    </div>
  );
}

function Bone({
  category,
  attachX,
  tipY,
  above,
}: {
  category: IshikawaCategory;
  attachX: number;
  tipY: number;
  above: boolean;
}) {
  // Bone slopes from the tip (up-left for top bones, down-left for
  // bottom bones) down/up to the spine.
  const tipX = attachX - 70;
  return (
    <g>
      <line
        x1={tipX}
        y1={tipY}
        x2={attachX}
        y2={SPINE_Y}
        stroke="#6b7280"
        strokeWidth={1.5}
      />
      {/* Category label box at the tip */}
      <rect
        x={tipX - 70}
        y={tipY - 13}
        width={140}
        height={22}
        rx={4}
        fill="#e5e7eb"
        stroke="#9ca3af"
      />
      <text
        x={tipX}
        y={tipY + 2}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#111827"
      >
        {truncate(category.label, 22)}
      </text>
      {/* Causes stacked vertically away from the spine */}
      {category.causes.map((cause, idx) => {
        const offset = (idx + 1) * 14;
        const y = above ? tipY - 18 - offset : tipY + 22 + offset;
        return (
          <text
            key={cause.id}
            x={tipX}
            y={y}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
          >
            • {truncate(cause.label, 28)}
          </text>
        );
      })}
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function CategoryColumns({
  diagram,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onAddCause,
  onUpdateCause,
  onRemoveCause,
}: {
  diagram: IshikawaDiagram;
  onAddCategory: (label: string) => void;
  onUpdateCategory: (categoryId: string, label: string) => void;
  onRemoveCategory: (categoryId: string) => void;
  onAddCause: (categoryId: string, label: string) => void;
  onUpdateCause: (causeId: string, label: string) => void;
  onRemoveCause: (causeId: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Categories and causes
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {diagram.categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onUpdateCategory={(label) => onUpdateCategory(cat.id, label)}
            onRemoveCategory={() => onRemoveCategory(cat.id)}
            onAddCause={(label) => onAddCause(cat.id, label)}
            onUpdateCause={onUpdateCause}
            onRemoveCause={onRemoveCause}
          />
        ))}
        <AddCategoryCard onAdd={onAddCategory} />
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  onUpdateCategory,
  onRemoveCategory,
  onAddCause,
  onUpdateCause,
  onRemoveCause,
}: {
  category: IshikawaCategory;
  onUpdateCategory: (label: string) => void;
  onRemoveCategory: () => void;
  onAddCause: (label: string) => void;
  onUpdateCause: (causeId: string, label: string) => void;
  onRemoveCause: (causeId: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <InlineEditable
          value={category.label}
          onCommit={onUpdateCategory}
          className="text-sm font-semibold text-gray-900"
        />
        <button
          type="button"
          onClick={onRemoveCategory}
          className="text-xs text-red-600 hover:underline"
          title="Remove this category and its causes"
        >
          Remove
        </button>
      </div>
      <ul className="space-y-1">
        {category.causes.map((cause) => (
          <li key={cause.id} className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">•</span>
            <InlineEditable
              value={cause.label}
              onCommit={(label) => onUpdateCause(cause.id, label)}
              className="text-gray-800 flex-1"
            />
            <button
              type="button"
              onClick={() => onRemoveCause(cause.id)}
              className="text-xs text-red-600 hover:underline"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <AddCauseRow onAdd={onAddCause} />
    </div>
  );
}

function AddCauseRow({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline mt-2"
      >
        + Add cause
      </button>
    );
  }
  const submit = () => {
    if (text.trim()) onAdd(text.trim());
    setText('');
    setOpen(false);
  };
  return (
    <div className="flex items-center gap-1 mt-2">
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="e.g. Insufficient triage capacity"
        className="border border-gray-300 rounded px-1 py-0.5 text-xs flex-1"
      />
      <button
        type="button"
        onClick={submit}
        className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white"
      >
        Add
      </button>
    </div>
  );
}

function AddCategoryCard({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        + Add category
      </button>
    );
  }
  const submit = () => {
    if (text.trim()) onAdd(text.trim());
    setText('');
    setOpen(false);
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Category name"
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
      />
      <button
        type="button"
        onClick={submit}
        className="text-sm px-2 py-1 rounded bg-blue-600 text-white"
      >
        Add
      </button>
    </div>
  );
}

function InlineEditable({
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
        className="border border-blue-300 rounded px-1 py-0.5 text-sm flex-1"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`text-left hover:underline ${className ?? ''}`}
      title="Click to edit"
    >
      {value || <span className="italic text-gray-400">empty</span>}
    </button>
  );
}
