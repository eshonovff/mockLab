"use client";

import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";

import { fetchProjectRequestMetrics, requestMetricsQueryKey } from "@/components/projects/api";
import { Card } from "@/components/ui/card";
import type { RequestMetricsDto } from "@/lib/dto";

// A hand-built bar chart, not a charting library — none is in CLAUDE.md §2's fixed stack, and
// 30 flat-color bars don't need one. Each bar's height is proportional to the series max, with
// a small visible floor so a quiet day still reads as a bar rather than disappearing entirely.
const MIN_BAR_HEIGHT_PERCENT = 4;

export function RequestMetricsCard({
  projectId,
  initialMetrics,
}: {
  projectId: string;
  initialMetrics: RequestMetricsDto;
}) {
  const t = useTranslations("dashboard.requests");
  const format = useFormatter();

  const { data } = useQuery({
    queryKey: requestMetricsQueryKey(projectId),
    queryFn: () => fetchProjectRequestMetrics(projectId),
    initialData: initialMetrics,
  });

  const max = Math.max(1, ...data.daily.map((day) => day.count));
  const total30Days = data.daily.reduce((sum, day) => sum + day.count, 0);

  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <p className="text-caption text-ink-muted">{t("title")}</p>
        <p className="text-h2 text-ink">{t("today", { count: data.today })}</p>
      </div>

      {/* The headline number above already carries the essential value for screen readers —
          the bars are a supplementary trend view, not independently meaningful without visual
          comparison, so they're decorative and this sentence stands in for them. */}
      <p className="sr-only">{t("summary", { total: total30Days })}</p>

      <div
        aria-hidden="true"
        className="flex h-16 items-end gap-1 px-(--card-spacing)"
      >
        {data.daily.map((day) => (
          <div
            key={day.date}
            title={`${format.dateTime(new Date(day.date), { dateStyle: "medium" })}: ${day.count}`}
            className="bg-accent/20 flex-1 rounded-[2px]"
            style={{
              height: `${Math.max(MIN_BAR_HEIGHT_PERCENT, (day.count / max) * 100)}%`,
              backgroundColor: day.count > 0 ? "var(--accent)" : undefined,
            }}
          />
        ))}
      </div>
      <p className="text-caption text-ink-muted px-(--card-spacing)">{t("last30Days")}</p>
    </Card>
  );
}
