import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { emptyDashboard } from '@/lib/dashboard/seed';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dashboards = await prisma.dashboard.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(dashboards);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = emptyDashboard();
  const dashboard = await prisma.dashboard.create({
    data: {
      userId: session.user.id,
      title: 'Untitled Dashboard',
      state: state as object,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: dashboard.id });
}
