"use client";

import { useFormatter, useTranslations } from "next-intl";

import { CopyButton } from "@/components/dashboard/copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectDto } from "@/lib/dto";

export function ProjectCard({ project, siteUrl }: { project: ProjectDto; siteUrl: string }) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const baseUrl = `${siteUrl}/m/${project.key}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>
          {t("card.resourceCount", { count: project.resourceCount })}
        </CardDescription>
      </CardHeader>
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
