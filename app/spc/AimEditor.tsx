'use client'
// Structured aim editor. The composed sentence is what gets read; the
// fields below it are the editable inputs. Following BGS QI Hub /
// IHI Model for Improvement structure: population × metric × magnitude
// × deadline.

import { useState } from 'react';
import { composeAimSentence } from '@/lib/project/operations';
import type { AimDirectionVerb, AimStatement } from '@/lib/project/types';

interface Props {
  aim: AimStatement;
  onUpdate: (patch: Partial<AimStatement>) => void;
}

export default function AimEditor({ aim, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sentence = composeAimSentence(aim);
  const hasContent = sentence.trim().length > 0;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Project aim
          </h2>
          {hasContent ? (
            <p className="text-base text-gray-900">{sentence}</p>
          ) : (
            <p className="text-base text-gray-400 italic">
              Add an aim statement — what are you trying to accomplish, for whom, and by when?
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          {expanded ? 'Done' : hasContent ? 'Edit' : 'Set aim'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Field label="Direction">
            <select
              value={aim.direction ?? ''}
              onChange={(e) =>
                onUpdate({
                  direction: e.target.value
                    ? (e.target.value as AimDirectionVerb)
                    : undefined,
                })
              }
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="">—</option>
              <option value="decrease">Reduce</option>
              <option value="increase">Increase</option>
              <option value="maintain">Maintain</option>
            </select>
          </Field>
          <Field label="Metric (what you're changing)">
            <input
              type="text"
              value={aim.metric ?? ''}
              onChange={(e) => onUpdate({ metric: e.target.value })}
              placeholder="e.g. average A&E wait time"
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
          <Field label="Population (who it applies to)">
            <input
              type="text"
              value={aim.population ?? ''}
              onChange={(e) => onUpdate({ population: e.target.value })}
              placeholder="e.g. adult patients in A&E"
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
          <Field label="Magnitude (the target value)">
            <input
              type="text"
              value={aim.magnitude ?? ''}
              onChange={(e) => onUpdate({ magnitude: e.target.value })}
              placeholder="e.g. below 4 hours, by 20%"
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
          <Field label="Deadline">
            <input
              type="text"
              value={aim.deadline ?? ''}
              onChange={(e) => onUpdate({ deadline: e.target.value })}
              placeholder="e.g. Q4 2026"
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
          <Field label="Free-text fallback (optional)">
            <textarea
              value={aim.text ?? ''}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Used if no structured fields are set"
              rows={2}
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
          </Field>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col">
      <span className="text-gray-600 mb-0.5">{label}</span>
      {children}
    </label>
  );
}
