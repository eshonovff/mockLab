import { notFound } from "next/navigation";

import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ProjectDto, ResourceDto } from "@/lib/dto";
import type { Locale } from "@/lib/locales";
import { getProjectRequestMetrics } from "@/lib/metering";

// The (app) layout (task 2.4) already redirects unauthenticated requests before this page ever
// renders — this re-check is cheap defense-in-depth, not the primary guard.
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) {
    return redirect({
      href: { pathname: "/login", query: { next: `/${locale}/dashboard/projects/${id}` } },
      locale: locale as Locale,
    });
  }

  // A project that exists but belongs to someone else 404s, same as it does behind the API
  // (app/api/projects/[id]/route.ts) — never confirms another user's project id is valid.
  const project = await db.project.findFirst({
    where: { id, userId: session.id },
    select: { id: true, name: true, key: true, createdAt: true },
  });

  if (!project) notFound();

  const [resources, initialRequestMetrics] = await Promise.all([
    db.resource.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        projectId: true,
        name: true,
        schema: true,
        seed: true,
        count: true,
        dataVersion: true,
      },
    }),
    getProjectRequestMetrics(project.id),
  ]);

  const projectDto: ProjectDto = {
    id: project.id,
    name: project.name,
    key: project.key,
    createdAt: project.createdAt.toISOString(),
    resourceCount: resources.length,
  };

  const initialResources: ResourceDto[] = resources.map((resource) => ({
    id: resource.id,
    projectId: resource.projectId,
    name: resource.name,
    schema: resource.schema as ResourceDto["schema"],
    seed: resource.seed,
    count: resource.count,
    dataVersion: resource.dataVersion,
  }));

  return (
    <ProjectDetailClient
      project={projectDto}
      initialResources={initialResources}
      initialRequestMetrics={initialRequestMetrics}
    />
  );
}
