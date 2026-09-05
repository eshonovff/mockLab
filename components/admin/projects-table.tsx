"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import {
  ADMIN_PROJECTS_QUERY_KEY,
  deleteAdminProject,
  fetchAdminProjects,
} from "@/components/admin/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminProjectDto } from "@/lib/dto";

// Owns its own delete mutation (rather than the table hoisting one shared mutation) so the
// dialog can close itself on success and stay open with the error still visible on failure —
// the same open/close-on-success-only contract `NewProjectDialog` already establishes.
function ProjectRow({ project }: { project: AdminProjectDto }) {
  const t = useTranslations("admin.projects");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => deleteAdminProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROJECTS_QUERY_KEY });
      toast.success(t("toasts.deleted"));
      setOpen(false);
    },
    onError: () => toast.error(t("toasts.error")),
  });

  return (
    <TableRow>
      <TableCell>{project.name}</TableCell>
      <TableCell className="font-mono text-caption text-ink-muted">{project.key}</TableCell>
      <TableCell className="text-ink-muted">{project.owner.email}</TableCell>
      <TableCell>{project.resourceCount}</TableCell>
      <TableCell className="text-ink-muted">
        {format.dateTime(new Date(project.createdAt), { dateStyle: "medium" })}
      </TableCell>
      <TableCell>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button variant="destructive" size="sm">
              {t("delete.trigger")}
            </Button>
          }
          title={t("delete.title")}
          description={t("delete.description", { name: project.name })}
          confirmText={t("delete.confirm")}
          confirmWord={project.name}
          loading={mutation.isPending}
          onConfirm={() => mutation.mutate()}
        />
      </TableCell>
    </TableRow>
  );
}

export function ProjectsTable({ initialProjects }: { initialProjects: AdminProjectDto[] }) {
  const t = useTranslations("admin.projects");

  const { data: projects } = useQuery({
    queryKey: ADMIN_PROJECTS_QUERY_KEY,
    queryFn: fetchAdminProjects,
    initialData: initialProjects,
  });

  return (
    <Card className="gap-4">
      <h2 className="text-h3 text-ink px-(--card-spacing)">{t("title")}</h2>

      {projects.length === 0 ? (
        <p className="text-body text-ink-muted px-(--card-spacing) py-8 text-center">
          {t("empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.key")}</TableHead>
              <TableHead>{t("table.owner")}</TableHead>
              <TableHead>{t("table.resources")}</TableHead>
              <TableHead>{t("table.created")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
