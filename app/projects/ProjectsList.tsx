'use client';
// Client list view. Reads projects from localStorage and offers create /
// open / rename / delete. No auth — projects live under a single local
// keyspace in the browser.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type ProjectSummary,
} from '@/lib/project/store';

export default function ProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    setProjects(listProjects());
    setHydrated(true);
  }, []);

  const refresh = () => setProjects(listProjects());

  const onCreate = () => {
    const project = createProject(newName.trim() || 'Untitled project');
    setNewName('');
    router.push(`/projects/${project.id}`);
  };

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteProject(id);
    refresh();
  };

  const onStartRename = (p: ProjectSummary) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const onCommitRename = () => {
    if (renamingId) {
      renameProject(renamingId, renameValue);
      setRenamingId(null);
      refresh();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900 hover:text-blue-700">
            SPC
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-700 hover:text-blue-700">
              Free chart
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My projects</h1>
            <p className="mt-1 text-sm text-gray-600">
              Each project is its own QI workspace &mdash; measures, drivers, PDSA cycles,
              incidents and more.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <label className="text-sm text-gray-700">New project</label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreate();
              }}
              placeholder="e.g. Falls reduction Q3"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1"
            />
            <button
              type="button"
              onClick={onCreate}
              className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </div>

        {!hydrated ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <h2 className="text-base font-medium text-gray-900 mb-1">
              You don&rsquo;t have any projects yet
            </h2>
            <p className="text-sm text-gray-600">
              Create your first project above &mdash; it&rsquo;ll be seeded with example data
              so you can see the pieces fit together.
            </p>
          </div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {projects.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                {renamingId === p.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={onCommitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onCommitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="border border-blue-300 rounded px-2 py-0.5 text-sm flex-1"
                  />
                ) : (
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex-1 text-sm font-medium text-blue-700 hover:underline"
                  >
                    {p.name}
                  </Link>
                )}
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Updated {formatRelative(p.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onStartRename(p)}
                  className="text-xs text-gray-500 hover:text-blue-700"
                  title="Rename"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id, p.name)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
