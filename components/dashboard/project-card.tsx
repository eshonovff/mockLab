"use client";

import { useFormatter, useTranslations } from "next-intl";

import { CopyButton } from "@/components/dashboard/copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { ProjectDto } from "@/lib/dto";

export function ProjectCard({ project, siteUrl }: { project: ProjectDto; siteUrl: string }) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const baseUrl = `${siteUrl}/m/${project.key}`;

  return (
    <Card>
      {/* Only the header links through to the project's resources — the copy button below is
          its own separate control, not nested inside this anchor (an interactive element
          inside an interactive element breaks keyboard/screen-reader semantics). */}
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="block rounded-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>
            {t("card.resourceCount", { count: project.resourceCount })}
          </CardDescription>
        </CardHeader>
      </Link>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-control border border-line bg-muted/50 px-3 py-2">
          <code className="text-caption min-w-0 flex-1 truncate font-mono text-ink-muted">
            {baseUrl}
          </code>
          <CopyButton
            value={baseUrl}
            label={t("card.copyUrl")}
            copiedToast={t("card.copied")}
            errorToast={t("toasts.error")}
          />
        </div>
        <p className="text-caption text-ink-muted">
          {t("card.createdOn", {
            date: format.dateTime(new Date(project.createdAt), { dateStyle: "medium" }),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
