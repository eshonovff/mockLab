"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { adminUsersQueryKey, fetchAdminUsers, updateAdminUser } from "@/components/admin/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminUserDto, AdminUsersListDto } from "@/lib/dto";
import type { UpdateUserInput } from "@/lib/validators";

// Switches, not buttons — both `role` and `status` are two-valued (CLAUDE.md §6: "restraint is
// the point"), and a table of toggles reads faster at a glance than a column of relabeling
// buttons ("Suspend" vs "Activate").
function UserRow({
  user,
  isSelf,
  pending,
  onToggleRole,
  onToggleStatus,
}: {
  user: AdminUserDto;
  isSelf: boolean;
  pending: boolean;
  onToggleRole: (checked: boolean) => void;
  onToggleStatus: (checked: boolean) => void;
}) {
  const t = useTranslations("admin.users");
  const format = useFormatter();

  const roleSwitch = (
    <Switch
      checked={user.role === "ADMIN"}
      disabled={pending || isSelf}
      aria-label={t("toggleAdmin", { email: user.email })}
      onCheckedChange={onToggleRole}
    />
  );

  const statusSwitch = (
    <Switch
      checked={user.status === "ACTIVE"}
      disabled={pending || isSelf}
      aria-label={t("toggleActive", { email: user.email })}
      onCheckedChange={onToggleStatus}
    />
  );

  return (
    <TableRow>
      <TableCell className="font-mono text-caption">
        {user.email}
        {isSelf && <span className="text-ink-muted ml-1.5 font-sans">({t("self")})</span>}
      </TableCell>
      <TableCell>{user.name ?? "—"}</TableCell>
      <TableCell>
        {isSelf ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{roleSwitch}</span>
            </TooltipTrigger>
            <TooltipContent>{t("selfHint")}</TooltipContent>
          </Tooltip>
        ) : (
          roleSwitch
        )}
      </TableCell>
      <TableCell>
        {isSelf ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{statusSwitch}</span>
            </TooltipTrigger>
            <TooltipContent>{t("selfHint")}</TooltipContent>
          </Tooltip>
        ) : (
          statusSwitch
        )}
      </TableCell>
      <TableCell className="text-ink-muted">
        {format.dateTime(new Date(user.createdAt), { dateStyle: "medium" })}
      </TableCell>
    </TableRow>
  );
}

export function UsersTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUsersListDto;
  currentUserId: string;
}) {
  const t = useTranslations("admin.users");
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: adminUsersQueryKey(page, search),
    queryFn: () => fetchAdminUsers(page, search),
    initialData: page === 1 && search === "" ? initialUsers : undefined,
    placeholderData: (previous) => previous,
  });

  const mutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateAdminUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(t("toasts.updated"));
    },
    onError: () => toast.error(t("toasts.error")),
    onSettled: () => setPendingId(null),
  });

  function handleToggle(id: string, input: UpdateUserInput) {
    setPendingId(id);
    mutation.mutate({ id, input });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    setSearch(value);
    setPage(1);
  }

  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-4 px-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-h3 text-ink">{t("title")}</h2>
        <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-xs">
          <Input
            type="search"
            name="search"
            // Input stays uncontrolled (see components/ui/input.tsx) — remounting on the
            // *committed* search value (not every keystroke) keeps the field in sync if
            // `search` is ever reset from elsewhere, without fighting the user's typing.
            key={search}
            defaultValue={search}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
        </form>
      </div>

      {data.users.length === 0 ? (
        <p className="text-body text-ink-muted px-(--card-spacing) py-8 text-center">
          {t("empty")}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.email")}</TableHead>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.admin")}</TableHead>
                <TableHead>{t("table.active")}</TableHead>
                <TableHead>{t("table.joined")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  pending={pendingId === user.id}
                  onToggleRole={(checked) =>
                    handleToggle(user.id, { role: checked ? "ADMIN" : "USER" })
                  }
                  onToggleStatus={(checked) =>
                    handleToggle(user.id, { status: checked ? "ACTIVE" : "SUSPENDED" })
                  }
                />
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-(--card-spacing)">
            <p className="text-caption text-ink-muted">
              {t("pageInfo", { page: data.page, totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                {t("previous")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
