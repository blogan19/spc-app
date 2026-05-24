'use client';
// Loads the project from localStorage by id, autosaves edits back, and
// renders ProjectWorkspace inside it. Owns the activeMeasureId selection
// so navigating away from the workspace and back lands on the same tab.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProjectWorkspace from '@/app/spc/ProjectWorkspace';
import LineChart from '@/app/spc/spc';
import { useProjectAutosave, type SaveStatus } from '@/lib/project/useProjectAutosave';
import { buildShareUrl } from '@/lib/project/share';
import { generateProjectReport } from '@/lib/project/exportPdf';

export default function ProjectShell({
  projectId,
}: {
  projectId: string;
}) {
  const { project, setProject, status } = useProjectAutosave(projectId);
  const [activeMeasureId, setActiveMeasureId] = useState<string>('');

  // Once the project hydrates, default the active measure to the first one.
  // Re-runs when the project id changes (in case the user nav'd between
  // two projects without unmounting the shell).
  useEffect(() => {
    if (project && !activeMeasureId) {
      setActiveMeasureId(project.measures[0]?.id ?? '');
    }
  }, [project, activeMeasureId]);

  if (status === 'loading') {
    return <CenteredMessage>Loading project…</CenteredMessage>;
  }

  if (status === 'missing' || !project) {
    return (
      <CenteredMessage>
        <p className="text-gray-900 font-medium">Project not found.</p>
        <p className="mt-1 text-sm text-gray-600">
          It may have been deleted, or it belongs to a different account.
        </p>
        <Link
          href="/projects"
          className="mt-4 inline-block px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Back to projects
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <>
      <ProjectWorkspace
        project={project}
        setProject={setProject}
        activeMeasureId={activeMeasureId}
        setActiveMeasureId={setActiveMeasureId}
        showBackToProjects
        navRight={
          <>
            <SaveIndicator status={status} />
            <ShareButton project={project} />
            <ReportButton project={project} />
          </>
        }
      />
      {/* Off-screen mount of every measure's chart, used purely as the
          source for the PDF report. Positioned far off-screen rather
          than display:none so d3 actually lays it out. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -10000,
          top: -10000,
          width: 1200,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        {project.measures.map((m) => {
          const isCategorical = m.chartKind === 'Pareto' || m.chartKind === 'Funnel';
          if (isCategorical) return null;
          return (
            <div key={m.id} data-pdf-measure-id={m.id}>
              <LineChart
                params={{
                  data: m.data,
                  aim: m.aim,
                  target: m.target,
                  chartKind: m.chartKind,
                  increment: m.increment,
                  ...m.settings,
                  title: m.name,
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Saving…
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-500 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Saved
    </span>
  );
}

function ShareButton({ project }: { project: import('@/lib/project/types').Project }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const url = buildShareUrl(project, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fall back to a prompt if clipboard isn't available (e.g. file://
      // or older browsers). Lets the user copy manually.
      window.prompt('Copy this read-only share link:', url);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
      title="Copy a read-only link to this project"
    >
      {copied ? 'Link copied!' : 'Share'}
    </button>
  );
}

function ReportButton({ project }: { project: import('@/lib/project/types').Project }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await generateProjectReport(project, (measureId) => {
        const container = document.querySelector(`[data-pdf-measure-id="${measureId}"]`);
        if (!container) return null;
        return container.querySelector('svg');
      });
    } catch (err) {
      // Surface a basic error rather than failing silently; the user
      // can retry or report.
      console.error('PDF generation failed:', err);
      alert('Sorry — could not build the PDF. Check the browser console for details.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
      title="Download a PDF report with the project's measures, drivers and PDSA cycles"
    >
      {busy ? 'Building…' : 'Download report'}
    </button>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md">
        {children}
      </div>
    </main>
  );
}
