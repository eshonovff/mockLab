import { notFound } from "next/navigation";

import { SchemaBuilder } from "@/components/builder/schema-builder";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ResourceDto } from "@/lib/dto";
import type { Locale } from "@/lib/locales";

// The (app) layout (task 2.4) already redirects unauthenticated requests before this page ever
// renders — this re-check is cheap defense-in-depth, not the primary guard.
export default async function ResourceBuilderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) {
    return redirect({
      href: { pathname: "/login", query: { next: `/${locale}/dashboard/resources/${id}` } },
      locale: locale as Locale,
    });
  }

  // A resource that exists but belongs to someone else 404s, same as behind the API
  // (app/api/resources/[id]/route.ts) — never confirms another user's resource id is valid.
  const resource = await db.resource.findFirst({
    where: { id, project: { userId: session.id } },
    select: {
      id: true,
      projectId: true,
      name: true,
      schema: true,
      seed: true,
      count: true,
      dataVersion: true,
    },
  });

  if (!resource) notFound();

  const initialResource: ResourceDto = {
    id: resource.id,
    projectId: resource.projectId,
    name: resource.name,
    schema: resource.schema as ResourceDto["schema"],
    seed: resource.seed,
    count: resource.count,
    dataVersion: resource.dataVersion,
  };

  return <SchemaBuilder initialResource={initialResource} />;
}
