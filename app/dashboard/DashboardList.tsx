'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { handleSignOut } from '@/app/auth/actions';

interface DashboardMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  dashboards: DashboardMeta[];
  userName: string | null | undefined;
  userEmail: string | null | undefined;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardList({ dashboards, userName, userEmail }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function createNew() {
    setCreating(true);
    try {
      const res = await fetch('/api/dashboards', { method: 'POST' });
      const data = await res.json();
      router.push(`/dashboard/${data.id}`);
    } catch {
      setCreating(false);
    }
  }

  async function deleteDashboard(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
    router.refresh();
    setDeleting(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-indigo-100/40">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white shadow-sm flex flex-col">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-700">NHS</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-800">SPC Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-700">{userName ?? userEmail}</p>
              {userName && <p className="text-xs text-slate-400">{userEmail}</p>}
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">My Dashboards</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {dashboards.length === 0 ? 'No dashboards yet' : `${dashboards.length} dashboard${dashboards.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={createNew}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
              </svg>
            )}
            New dashboard
          </button>
        </div>

        {dashboards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-indigo-400">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-slate-800 mb-2">Create your first dashboard</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Upload your NHS data and build SPC charts, KPI tiles, and more.
            </p>
            <button
              type="button"
              onClick={createNew}
              disabled={creating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Create dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d) => (
              <div
                key={d.id}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/${d.id}`)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-indigo-500">
                        <rect x="1" y="1" width="6" height="6" rx="1" />
                        <rect x="9" y="1" width="6" height="6" rx="1" />
                        <rect x="1" y="9" width="6" height="6" rx="1" />
                        <rect x="9" y="9" width="6" height="6" rx="1" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id, d.title); }}
                      disabled={deleting === d.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Delete dashboard"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1zM3 5h10l-1 9H4L3 5zm4 2v5a.5.5 0 001 0V7a.5.5 0 00-1 0zm3 0v5a.5.5 0 001 0V7a.5.5 0 00-1 0z" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mt-3 truncate">
                    {d.title || 'Untitled Dashboard'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Updated {formatDate(d.updatedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600">SPC Dashboard</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs text-slate-400">Statistical Process Control for Quality Improvement</span>
          </div>
          <span className="text-xs text-slate-300">NHS Making Data Count</span>
        </div>
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      </footer>
    </div>
  );
}
