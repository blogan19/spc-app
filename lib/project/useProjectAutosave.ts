'use client';
// Debounced autosave for a Project. Owns the project + setProject pair, so
// callers can use it as a near drop-in replacement for `useState(project)`:
//
//   const { project, setProject, status } = useProjectAutosave(id);
//
// Save happens 400ms after the last mutation. Status flips through
// 'saved' -> 'saving' -> 'saved' so the UI can show 'Saved · 2s ago' etc.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getProject, saveProject } from './store';
import type { Project } from './types';

export type SaveStatus = 'loading' | 'missing' | 'saved' | 'saving';

const SAVE_DEBOUNCE_MS = 400;

export function useProjectAutosave(projectId: string) {
  const [project, setProjectState] = useState<Project | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest pending value waiting on the debounce timer. null means nothing
  // queued — used so unmount can flush the final edit synchronously.
  const pending = useRef<Project | null>(null);

  // Hydrate from localStorage once mounted.
  useEffect(() => {
    const loaded = getProject(projectId);
    if (loaded) {
      setProjectState(loaded);
      setStatus('saved');
    } else {
      setProjectState(null);
      setStatus('missing');
    }
  }, [projectId]);

  // Debounced commit. Caller invokes setProject(next) like normal useState.
  const setProject = useCallback((next: Project) => {
    setProjectState(next);
    pending.current = next;
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveProject(next);
      pending.current = null;
      setStatus('saved');
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // Flush any pending write on unmount so the last edit before navigation
  // isn't lost. (The debounce timer would otherwise be cancelled.)
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) {
        saveProject(pending.current);
        pending.current = null;
      }
    };
  }, []);

  return { project, setProject, status };
}
