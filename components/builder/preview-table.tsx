"use client";

import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function PreviewTable({
  records,
  isFetching,
  isError,
}: {
  records: Record<string, unknown>[];
  isFetching: boolean;
  isError: boolean;
}) {
  const t = useTranslations("builder");

  if (isError) {
    return <p className="text-caption text-badge-rose-fg">{t("preview.error")}</p>;
  }

  if (records.length === 0) {
    return <p className="text-caption text-ink-muted">{t("preview.empty")}</p>;
  }

  const columns = Object.keys(records[0] ?? {});

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-control border border-line transition-opacity",
        isFetching && "opacity-60",
      )}
      aria-busy={isFetching}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className="font-mono whitespace-nowrap">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            // A preview record's own `id` is stable across regenerations of the same seed but
            // not across every possible edit (a field rename regenerates the whole preview
            // anyway) — the row's position is what's actually stable within one preview result.
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column} className="whitespace-nowrap font-mono text-caption">
                  {formatPreviewValue(record[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
