import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ProjectDto } from "@/lib/dto";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/locales";

// The (app) layout (task 2.4) already redirects unauthenticated requests before this page ever
// renders — this re-check is cheap defense-in-depth, not the primary guard.
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) {
    return redirect({
      href: { pathname: "/login", query: { next: `/${locale}/dashboard` } },
      locale: locale as Locale,
    });
  }

  const projects = await db.project.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
      _count: { select: { resources: true } },
    },
  });

  const initialProjects: ProjectDto[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    key: project.key,
    createdAt: project.createdAt.toISOString(),
    resourceCount: project._count.resources,
  }));

  return <DashboardClient initialProjects={initialProjects} siteUrl={env.NEXT_PUBLIC_SITE_URL} />;
}
