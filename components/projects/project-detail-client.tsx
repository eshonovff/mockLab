"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { fetchResources, resourcesQueryKey } from "@/components/projects/api";
import { JsonImportDialog } from "@/components/projects/json-import-dialog";
import { NewResourceDialog } from "@/components/projects/new-resource-dialog";
import { RequestMetricsCard } from "@/components/projects/request-metrics-card";
import { ResourceCard } from "@/components/projects/resource-card";
import type { ProjectDto, RequestMetricsDto, ResourceDto } from "@/lib/dto";

export function ProjectDetailClient({
  project,
  initialResources,
  initialRequestMetrics,
}: {
  project: ProjectDto;
  initialResources: ResourceDto[];
  initialRequestMetrics: RequestMetricsDto;
}) {
  const t = useTranslations("dashboard");
  const { data: resources } = useQuery({
    queryKey: resourcesQueryKey(project.id),
    queryFn: () => fetchResources(project.id),
    initialData: initialResources,
  });

  if (resources.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-display text-ink">{project.name}</h1>
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-20 text-center">
          <p className="text-body text-ink-muted">{t("resources.empty.title")}</p>
          <div className="flex items-center gap-2">
            <NewResourceDialog projectId={project.id} />
            <JsonImportDialog projectId={project.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display text-ink">{project.name}</h1>
        <div className="flex items-center gap-2">
          <NewResourceDialog projectId={project.id} />
          <JsonImportDialog projectId={project.id} />
        </div>
      </div>

      <RequestMetricsCard projectId={project.id} initialMetrics={initialRequestMetrics} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}
