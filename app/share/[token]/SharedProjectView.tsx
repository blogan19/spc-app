'use client';
// View-only renderer for a shared project. Decodes the token client-side
// (Next would otherwise need to decompress on the server too), then
// renders ProjectWorkspace in a read-only mode by discarding all
// mutation callbacks.

import { useMemo } from 'react';
import Link from 'next/link';
import { decodeProjectShare } from '@/lib/project/share';
import ProjectWorkspace from '@/app/spc/ProjectWorkspace';

export default function SharedProjectView({ token }: { token: string }) {
  const project = useMemo(() => decodeProjectShare(token), [token]);

  if (!project) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-md">
          <p className="text-gray-900 font-medium">This share link is invalid.</p>
          <p className="mt-1 text-sm text-gray-600">
            It may have been copied incompletely, or it&rsquo;s from a newer version
            of the app.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Open the free chart
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ProjectWorkspace
      project={project}
      // No-op setProject — every mutation gets swallowed so the view
      // stays exactly as the link describes. We pick the first measure
      // by default and let the user switch tabs via the existing nav.
      setProject={() => {}}
      activeMeasureId={project.measures[0]?.id ?? ''}
      setActiveMeasureId={() => {}}
      readOnly
      navRight={
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Read-only share link
        </span>
      }
    />
  );
}
