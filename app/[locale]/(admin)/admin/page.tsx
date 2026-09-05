import { AdminClient } from "@/components/admin/admin-client";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AdminProjectDto, AdminStatsDto, AdminUserDto, AdminUsersListDto } from "@/lib/dto";
import type { Locale } from "@/lib/locales";

const USERS_PAGE_SIZE = 20;

// The (admin) layout (task 2.4) already redirects/404s before this page ever renders — this
// re-check is cheap defense-in-depth, not the primary guard, matching the dashboard page's own
// comment for the same pattern.
export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return redirect({
      href: { pathname: "/login", query: { next: `/${locale}/admin` } },
      locale: locale as Locale,
    });
  }

  const [userCount, projectCount, resourceCount, users, projects] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.resource.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: USERS_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        locale: true,
        createdAt: true,
      },
    }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true,
        createdAt: true,
        _count: { select: { resources: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    }),
  ]);

  const initialStats: AdminStatsDto = {
    users: userCount,
    projects: projectCount,
    resources: resourceCount,
  };

  const initialUsers: AdminUsersListDto = {
    users: users.map(
      (user): AdminUserDto => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        locale: user.locale,
        createdAt: user.createdAt.toISOString(),
      }),
    ),
    total: userCount,
    page: 1,
    limit: USERS_PAGE_SIZE,
  };

  const initialProjects: AdminProjectDto[] = projects.map(
    (project): AdminProjectDto => ({
      id: project.id,
      name: project.name,
      key: project.key,
      createdAt: project.createdAt.toISOString(),
      resourceCount: project._count.resources,
      owner: project.user,
    }),
  );

  return (
    <AdminClient
      initialStats={initialStats}
      initialUsers={initialUsers}
      initialProjects={initialProjects}
      currentUserId={session.id}
    />
  );
}
