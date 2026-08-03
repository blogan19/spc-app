'use client';

import type { AnnotationDef } from '@/lib/dashboard/types';

interface AnnotationsPanelProps {
  annotationIds: string[];
  annotations: AnnotationDef[];
  onChange: (ids: string[]) => void;
}

export default function AnnotationsPanel({ annotationIds, annotations, onChange }: AnnotationsPanelProps) {
  const toggle = (id: string) => {
    if (annotationIds.includes(id)) {
      onChange(annotationIds.filter((x) => x !== id));
    } else {
      onChange([...annotationIds, id]);
    }
  };

  if (annotations.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-700 mb-1.5">Annotations</p>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          No annotations in library. Close this editor and add some via the Annotations button in the toolbar.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-700 mb-1.5">Annotations</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
        {annotations.map((ann) => {
          const active = annotationIds.includes(ann.id);
          return (
            <label key={ann.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(ann.id)}
                className="rounded border-gray-300 focus:ring-[#005EB8]"
                style={{ accentColor: ann.color }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: ann.color }}
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1 truncate">
                {ann.label}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                {ann.date}
              </span>
            </label>
          );
        })}
      </div>
      {annotationIds.length > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          {annotationIds.length} annotation{annotationIds.length !== 1 ? 's' : ''} applied
        </p>
      )}
    </div>
  );
}
