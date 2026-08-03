'use client';

import { useState } from 'react';
import type { TileDetails, TileAction, ActionStatus } from '@/lib/dashboard/types';
import { newId } from '@/lib/dashboard/seed';

interface TileDetailsPanelProps {
  chartName: string;
  initialDetails: TileDetails;
  initialSection?: 'actions';
  onSave: (details: TileDetails) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<ActionStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'complete': 'Complete',
};

const STATUS_COLORS: Record<ActionStatus | 'overdue', string> = {
  'not-started': 'bg-gray-200 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'complete': 'bg-emerald-100 text-emerald-700',
  'overdue': 'bg-red-100 text-red-700',
};

const TODAY = new Date().toISOString().slice(0, 10);

function effectiveStatus(action: TileAction): ActionStatus | 'overdue' {
  if (action.status === 'complete') return 'complete';
  if (action.dueDate && action.dueDate < TODAY) return 'overdue';
  return action.status;
}

function ActionForm({
  action,
  onSave,
  onCancel,
}: {
  action: Partial<TileAction>;
  onSave: (a: TileAction) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState(action.description ?? '');
  const [owner, setOwner] = useState(action.owner ?? '');
  const [dueDate, setDueDate] = useState(action.dueDate ?? '');
  const [status, setStatus] = useState<ActionStatus>(action.status ?? 'not-started');

  return (
    <div className="space-y-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">What is being done</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Describe the action…"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Name or role"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ActionStatus)}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {(Object.keys(STATUS_LABELS) as ActionStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-xs py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!desc.trim()}
          onClick={() =>
            onSave({
              id: action.id ?? newId(),
              description: desc.trim(),
              owner: owner.trim(),
              dueDate,
              status,
            })
          }
          className="flex-1 text-xs py-1.5 rounded-lg bg-[#005EB8] text-white font-medium hover:bg-[#003087] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save action
        </button>
      </div>
    </div>
  );
}

export default function TileDetailsPanel({
  chartName,
  initialDetails,
  onSave,
  onClose,
}: TileDetailsPanelProps) {
  const [details, setDetails] = useState<TileDetails>(initialDetails);
  const [editingActionId, setEditingActionId] = useState<string | 'new' | null>(null);

  const set = <K extends keyof TileDetails>(k: K, v: TileDetails[K]) =>
    setDetails((d) => ({ ...d, [k]: v }));

  const saveAction = (action: TileAction) => {
    setDetails((d) => ({
      ...d,
      actions: editingActionId === 'new'
        ? [...d.actions, action].sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1)
        : d.actions.map((a) => (a.id === action.id ? action : a))
            .sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1),
    }));
    setEditingActionId(null);
  };

  const deleteAction = (id: string) => {
    setDetails((d) => ({ ...d, actions: d.actions.filter((a) => a.id !== id) }));
  };

  return (
    <div className="fixed top-[53px] right-0 bottom-0 w-96 bg-white border-l border-gray-200 z-30 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{chartName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
          aria-label="Close details panel"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* Description */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Description
          </h4>
          <textarea
            value={details.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            placeholder="Plain English description of what this metric measures, why it matters, and how it is calculated…"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </section>

        {/* Target */}
        <section>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Target
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target value</label>
                <input
                  type="number"
                  value={details.targetValue ?? ''}
                  onChange={(e) =>
                    set('targetValue', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="e.g. 95"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target by date</label>
                <input
                  type="date"
                  value={details.targetDate}
                  onChange={(e) => set('targetDate', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target label</label>
              <input
                type="text"
                value={details.targetLabel}
                onChange={(e) => set('targetLabel', e.target.value)}
                placeholder="e.g. National standard, Trust trajectory"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Direction</label>
              <div className="flex gap-2">
                {(['higher', 'lower', 'range'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set('targetDirection', d)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                      details.targetDirection === d
                        ? 'border-[#005EB8] bg-blue-50 text-[#005EB8] font-medium'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d === 'higher' ? '↑ Higher' : d === 'lower' ? '↓ Lower' : '↔ Range'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target preview */}
            {details.targetValue !== null && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Target: <strong>{details.targetValue}</strong>
                {details.targetLabel && ` (${details.targetLabel})`}
                {details.targetDate && ` by ${new Date(details.targetDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
              </div>
            )}
          </div>
        </section>

        {/* Actions */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Actions
              {details.actions.length > 0 && (
                <span className="ml-1.5 text-gray-400 font-normal normal-case">
                  ({details.actions.length})
                </span>
              )}
            </h4>
          </div>

          <div className="space-y-2">
            {details.actions.map((action) => {
              const eff = effectiveStatus(action);
              if (editingActionId === action.id) {
                return (
                  <ActionForm
                    key={action.id}
                    action={action}
                    onSave={saveAction}
                    onCancel={() => setEditingActionId(null)}
                  />
                );
              }
              return (
                <div
                  key={action.id}
                  className="group border border-gray-200 rounded-xl p-3 bg-white hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[eff]}`}>
                      {eff === 'overdue' ? 'Overdue' : STATUS_LABELS[action.status]}
                    </span>
                    <p className="text-sm text-gray-800 flex-1 leading-snug">{action.description}</p>
                  </div>
                  {(action.owner || action.dueDate) && (
                    <div className="flex items-center gap-3 mt-1.5 pl-0.5">
                      {action.owner && (
                        <span className="text-xs text-gray-400">{action.owner}</span>
                      )}
                      {action.dueDate && (
                        <span className={`text-xs ${eff === 'overdue' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          Due {new Date(action.dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditingActionId(action.id)}
                      className="text-xs text-[#005EB8] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAction(action.id)}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {editingActionId === 'new' ? (
              <ActionForm
                action={{}}
                onSave={saveAction}
                onCancel={() => setEditingActionId(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingActionId('new')}
                className="w-full text-sm py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#005EB8] hover:text-[#005EB8] transition-colors"
              >
                + Add action
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 text-sm py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => { onSave(details); onClose(); }}
          className="flex-1 text-sm py-2 rounded-xl bg-[#005EB8] hover:bg-[#003087] text-white font-medium transition-colors"
        >
          Save details
        </button>
      </div>
    </div>
  );
}
