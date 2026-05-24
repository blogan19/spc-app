'use client';
// Landing page = the free, ephemeral SPC chart. State lives only in this
// component's useState — nothing is written to localStorage. The navbar
// links to the /projects workspace where work *is* persisted (locally).

import { useState } from 'react';
import Link from 'next/link';
import MeasureView from '@/app/spc/MeasureView';
import { createSeedProject } from '@/lib/project/seed';
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
import type { ChartSettings, Project, RecalcJustification } from '@/lib/project/types';

export default function Home() {
  // Seed a single-measure project. Only the first measure is shown; the
  // rest of the Project shape exists to satisfy MeasureView's prop
  // contract (events lookup will return [] since there's no driver
  // diagram or incident dataset).
  const [project, setProject] = useState<Project>(() => {
    const seed = createSeedProject();
    return { ...seed, measures: seed.measures.slice(0, 1) };
  });
  const measure = project.measures[0];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="font-semibold text-gray-900 hover:text-blue-700">
            SPC
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/projects" className="text-gray-700 hover:text-blue-700">
              My projects
            </Link>
          </nav>
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <span>
            You&rsquo;re in the free chart. Changes live only in this browser tab and will be
            lost when you close it. Open <strong>My projects</strong> to keep your work.
          </span>
        </div>
      </div>

      {measure ? (
        <MeasureView
          measure={measure}
          project={project}
          onUpdateRowField={(rowIndex, field, value) =>
            setProject(
              updateRowField(project, measure.id, rowIndex, field as RowField, value),
            )
          }
          onAddRow={(date) => setProject(addEmptyRow(project, measure.id, date))}
          onSetRecalculation={(rowIndex, justification: RecalcJustification | null) =>
            setProject(setRowRecalculation(project, measure.id, rowIndex, justification))
          }
          onUpdateSettings={(patch: Partial<ChartSettings>) =>
            setProject(updateMeasureSettings(project, measure.id, patch))
          }
          onUpdateRows={(rows) => setProject(setMeasureRows(project, measure.id, rows))}
          onUpdateMeasureMeta={(patch) =>
            setProject(updateMeasureMeta(project, measure.id, patch))
          }
          onSetupMeasure={({ rows, increment, name, settings, chartKind, aim }) =>
            setProject(
              setMeasureSetup(project, measure.id, rows, increment, {
                name,
                settings,
                chartKind,
                aim,
              }),
            )
          }
        />
      ) : (
        <p className="px-6 py-10 text-gray-500">No measure to display.</p>
      )}
    </main>
  );
}
