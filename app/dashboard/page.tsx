import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardList from './DashboardList';
import DashboardWorkspace from './DashboardWorkspace';

export default async function DashboardPage() {
  const session = await auth();

  if (session?.user?.id) {
    const dashboards = await prisma.dashboard.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    const serialised = dashboards.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
    return (
      <DashboardList
        dashboards={serialised}
        userName={session.user.name}
        userEmail={session.user.email}
      />
    );
  }

  // No session — render the ephemeral local workspace (JSON save/load only)
  return <DashboardWorkspace />;
}
