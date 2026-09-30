import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import DashboardWorkspace from '../DashboardWorkspace';
import type { DashboardState } from '@/lib/dashboard/types';
import { nhsTheme } from '@/lib/dashboard/seed';

export default async function DashboardIdPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const dashboard = await prisma.dashboard.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!dashboard) notFound();

  const state = dashboard.state as unknown as DashboardState;
  state.dashboard.theme = { ...nhsTheme, ...state.dashboard.theme };
  state.ragRules = state.ragRules ?? [];
  state.metrics = state.metrics ?? [];
  state.annotations = state.annotations ?? [];
  state.stories = state.stories ?? [];
  state.slideDecks = state.slideDecks ?? [];

  return <DashboardWorkspace dashboardId={params.id} initialState={state} />;
}
