'use client';

import { useState } from 'react';
import MeasureView from '@/app/spc/MeasureView';
import { emptyMeasure } from '@/lib/project/seed';
import { nhsChartColors, newId } from '@/lib/dashboard/seed';
import {
  addEmptyRow,
  setMeasureRows,
  setMeasureSetup,
  setRowRecalculation,
  updateMeasureMeta,
  updateMeasureSettings,
  updateRowField,
  type RowField,
} from '@/lib/project/operations';
import type { ChartSettings, Measure, Project, RecalcJustification } from '@/lib/project/types';
import type { SetupSubmit } from '@/app/spc/DateSetupForm';

interface SpcTileEditorProps {
  initialMeasure?: Measure;
  onSave: (measure: Measure) => void;
  onCancel: () => void;
}

function wrap(measure: Measure): Project {
  return {
    id: measure.id,
    name: measure.name,
    createdAt: new Date().toISOString(),
    aim: {},
    measures: [measure],
    pdsaCycles: [],
    driverDiagram: null,
    ishikawa: null,
    processMap: null,
    incidentDataset: null,
  };
}

function newDashboardMeasure(): Measure {
  const id = newId();
  const base = emptyMeasure(id, 'New chart');
  return { ...base, settings: { ...base.settings, ...nhsChartColors } };
}

export default function SpcTileEditor({ initialMeasure, onSave, onCancel }: SpcTileEditorProps) {
  const [measure, setMeasure] = useState<Measure>(() => initialMeasure ?? newDashboardMeasure());
  const isNew = !initialMeasure;

  const op = (fn: (p: Project) => Project) => {
    setMeasure((prev) => fn(wrap(prev)).measures[0]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      {/* Sticky editor header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
          title="Close"
          aria-label="Close"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            {isNew ? 'Add SPC chart' : 'Edit SPC chart'}
          </p>
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {measure.name || 'Untitled chart'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSave(measure)}
            disabled={measure.data.length === 0}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isNew ? 'Add to dashboard' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* MeasureView fills the rest */}
      <MeasureView
        measure={measure}
        onUpdateRowField={(rowIndex, field, value) =>
          op((p) => updateRowField(p, measure.id, rowIndex, field as RowField, value))
        }
        onAddRow={(date) => op((p) => addEmptyRow(p, measure.id, date))}
        onSetRecalculation={(rowIndex, justification: RecalcJustification | null) =>
          op((p) => setRowRecalculation(p, measure.id, rowIndex, justification))
        }
        onUpdateSettings={(patch: Partial<ChartSettings>) =>
          op((p) => updateMeasureSettings(p, measure.id, patch))
        }
        onUpdateRows={(rows) => op((p) => setMeasureRows(p, measure.id, rows))}
        onUpdateMeasureMeta={(patch) => op((p) => updateMeasureMeta(p, measure.id, patch))}
        onSetupMeasure={({ rows, increment, name, settings, chartKind, aim, target, splitBy }: SetupSubmit) =>
          op((p) =>
            setMeasureSetup(p, measure.id, rows, increment, {
              name,
              settings: { ...nhsChartColors, ...settings },
              chartKind,
              aim,
              target,
              splitBy,
            }),
          )
        }
      />
    </div>
  );
}
