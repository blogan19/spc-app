'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardState } from './types';
import { emptyDashboard } from './seed';

export type SaveStatus = 'saved' | 'saving' | 'local';

export function useDashboardAutosave(
  dashboardId: string | undefined,
  initialState: DashboardState | undefined,
) {
  const [state, setStateInner] = useState<DashboardState>(initialState ?? emptyDashboard());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(dashboardId ? 'saved' : 'local');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  const setState = useCallback(
    (updater: DashboardState | ((prev: DashboardState) => DashboardState)) => {
      setStateInner(updater);
    },
    [],
  ) as typeof setStateInner;

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Local mode — no cloud save
    if (!dashboardId) return;

    setSaveStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, title: state.dashboard.title }),
      })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('saved'));
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, dashboardId]);

  return { state, setState, saveStatus };
}
