"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { fetchProjects, PROJECTS_QUERY_KEY } from "@/components/dashboard/api";
import { CopyButton } from "@/components/dashboard/copy-button";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { ProjectCard } from "@/components/dashboard/project-card";
import type { ProjectDto } from "@/lib/dto";

export function DashboardClient({
  initialProjects,
  siteUrl,
}: {
  initialProjects: ProjectDto[];
  siteUrl: string;
}) {
  const t = useTranslations("dashboard");
  const { data: projects } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchProjects,
    initialData: initialProjects,
  });

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-6 py-20 text-center">
        <p className="text-body text-ink-muted">{t("empty.title")}</p>
        <NewProjectDialog />
      </div>
    );
  }

  // Ordered by createdAt desc (the API's own order) — the first entry is the most recently
  // created project, used as the "most recently used" proxy (CLAUDE.md §6's promoted card):
  // nothing in the data model tracks actual mock-API usage, and adding that tracking is its
  // own piece of infrastructure, out of scope for this page.
  const heroProject = projects[0];
  if (!heroProject) return null; // unreachable — guarded by the length check above.
  const heroBaseUrl = `${siteUrl}/m/${heroProject.key}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card bg-rail p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption text-surface/60">{t("hero.label")}</p>
          <p className="truncate font-mono text-body text-surface">{heroBaseUrl}</p>
        </div>
        <CopyButton
          value={heroBaseUrl}
          label={t("hero.copyUrl")}
          copiedToast={t("hero.copied")}
          errorToast={t("toasts.error")}
          className="shrink-0 self-start text-surface hover:bg-surface/10 hover:text-surface sm:self-auto"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display text-ink">{t("title")}</h1>
        <NewProjectDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} siteUrl={siteUrl} />
        ))}
      </div>
    </div>
  );
}
