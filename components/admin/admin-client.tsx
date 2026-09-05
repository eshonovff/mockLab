"use client";

import { useTranslations } from "next-intl";

import { ProjectsTable } from "@/components/admin/projects-table";
import { StatCards } from "@/components/admin/stat-cards";
import { UsersTable } from "@/components/admin/users-table";
import type { AdminProjectDto, AdminStatsDto, AdminUsersListDto } from "@/lib/dto";

export function AdminClient({
  initialStats,
  initialUsers,
  initialProjects,
  currentUserId,
}: {
  initialStats: AdminStatsDto;
  initialUsers: AdminUsersListDto;
  initialProjects: AdminProjectDto[];
  currentUserId: string;
}) {
  const t = useTranslations("admin");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-display text-ink">{t("title")}</h1>
      <StatCards initialStats={initialStats} />
      <UsersTable initialUsers={initialUsers} currentUserId={currentUserId} />
      <ProjectsTable initialProjects={initialProjects} />
    </div>
  );
}
