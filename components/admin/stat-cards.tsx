"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ADMIN_STATS_QUERY_KEY, fetchAdminStats } from "@/components/admin/api";
import { Card } from "@/components/ui/card";
import type { AdminStatsDto } from "@/lib/dto";

const STAT_KEYS = ["users", "projects", "resources"] as const;

export function StatCards({ initialStats }: { initialStats: AdminStatsDto }) {
  const t = useTranslations("admin.stats");
  const { data } = useQuery({
    queryKey: ADMIN_STATS_QUERY_KEY,
    queryFn: fetchAdminStats,
    initialData: initialStats,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STAT_KEYS.map((key) => (
        <Card key={key} className="gap-1.5">
          <p className="text-caption text-ink-muted px-(--card-spacing)">{t(key)}</p>
          <p className="text-display text-ink px-(--card-spacing)">{data[key].toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
}
