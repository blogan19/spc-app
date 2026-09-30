'use client';

import { useState, useMemo } from 'react';
import { HELP_ARTICLES } from '@/lib/dashboard/helpArticles';
import type { HelpArticle } from '@/lib/dashboard/helpArticles';

interface Props {
  initialArticleId?: string;
  onClose: () => void;
}

function search(query: string): HelpArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((a) =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.tags.some((t) => t.includes(q)) ||
    a.sections.some((s) => s.body.toLowerCase().includes(q) || (s.heading ?? '').toLowerCase().includes(q)),
  );
}

function ArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-xs"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <h2 className="text-base font-bold text-slate-900 leading-snug">{article.title}</h2>
        <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-indigo-500/30 pl-3">{article.summary}</p>

        {article.sections.map((section, i) => (
          <div key={i} className="space-y-1.5">
            {section.heading && (
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{section.heading}</h3>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HelpPanel({ initialArticleId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialArticleId ?? null);

  const results = useMemo(() => search(query), [query]);
  const selectedArticle = selectedId ? HELP_ARTICLES.find((a) => a.id === selectedId) ?? null : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3.5c.55 0 1 .45 1 1V11a1 1 0 01-2 0V8.5c0-.55.45-1 1-1z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">Help &amp; guidance</p>
            <p className="text-[11px] text-slate-400">{HELP_ARTICLES.length} articles</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            aria-label="Close help panel"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {selectedArticle ? (
          <ArticleView article={selectedArticle} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                >
                  <circle cx="6.5" cy="6.5" r="4" />
                  <path d="M10 10l3 3" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 opacity-40">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5l4 4" strokeLinecap="round" />
                  </svg>
                  No articles found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((article) => (
                    <li key={article.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(article.id)}
                        className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                      >
                        <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug mb-0.5">
                          {article.title}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{article.summary}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                All data stays in your browser. Nothing is sent to a server.
                Have a question not answered here? Contact your system administrator.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
