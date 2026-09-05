import { db } from "@/lib/db";
import type { RequestMetricsDto } from "@/lib/dto";

// CLAUDE.md §8.3: "Keep 30 days, prune older rows."
const RETENTION_DAYS = 30;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Increments today's (UTC) request count for a project, creating the row if this is the first
 * request of the day. Also prunes this project's own rows older than the retention window as
 * part of the same write — there's no separate cron/job runner in this app to do it any other
 * way, and piggybacking on the write that's already happening is the "lightweight" reading of
 * CLAUDE.md §8.3 (same spirit as `lib/ratelimit.ts`'s in-memory-for-v1 scope).
 *
 * Called from every `/m/{key}/{resource}*` handler right after it resolves a real project —
 * never for a 404 (unknown key) or a 429 (rate-limited before resolution), so a stranger
 * guessing at project keys can't inflate another project's counter.
 */
export async function recordRequest(projectId: string): Promise<void> {
  const today = startOfUtcDay(new Date());
  const cutoff = startOfUtcDay(new Date());
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);

  await db.$transaction([
    db.requestCount.upsert({
      where: { projectId_date: { projectId, date: today } },
      create: { projectId, date: today, count: 1 },
      update: { count: { increment: 1 } },
    }),
    db.requestCount.deleteMany({ where: { projectId, date: { lt: cutoff } } }),
  ]);
}

/**
 * Today's count plus a zero-filled daily series for the full retention window, oldest first —
 * "surfaced ... in the user's own project page" (CLAUDE.md §8.3). Zero-filled so the UI renders
 * a consistent 30-bar series instead of having to handle gaps for quiet days.
 */
export async function getProjectRequestMetrics(projectId: string): Promise<RequestMetricsDto> {
  const today = startOfUtcDay(new Date());
  const rangeStart = startOfUtcDay(new Date());
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (RETENTION_DAYS - 1));

  const rows = await db.requestCount.findMany({
    where: { projectId, date: { gte: rangeStart } },
    select: { date: true, count: true },
  });
  const countsByDate = new Map(rows.map((row) => [isoDateKey(row.date), row.count]));

  const daily: RequestMetricsDto["daily"] = [];
  for (let i = RETENTION_DAYS - 1; i >= 0; i--) {
    const day = startOfUtcDay(new Date());
    day.setUTCDate(day.getUTCDate() - i);
    const key = isoDateKey(day);
    daily.push({ date: key, count: countsByDate.get(key) ?? 0 });
  }

  return { today: countsByDate.get(isoDateKey(today)) ?? 0, daily };
}

/** Sum of every project's request count for today (UTC) — the admin panel's fourth stat. */
export async function getTotalRequestsToday(): Promise<number> {
  const today = startOfUtcDay(new Date());
  const result = await db.requestCount.aggregate({
    where: { date: today },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}
