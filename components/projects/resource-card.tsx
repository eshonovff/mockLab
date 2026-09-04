"use client";

import { useTranslations } from "next-intl";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { ResourceDto } from "@/lib/dto";

export function ResourceCard({ resource }: { resource: ResourceDto }) {
  const t = useTranslations("dashboard");
  const fieldCount = resource.schema.fields.length;

  return (
    <Card>
      <Link
        href={`/dashboard/resources/${resource.id}`}
        className="block rounded-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <CardHeader>
          <CardTitle>{resource.name}</CardTitle>
          <CardDescription>
            {t("resources.recordCount", { count: resource.count })}
            {" · "}
            {t("resources.fieldCount", { count: fieldCount })}
          </CardDescription>
        </CardHeader>
      </Link>
    </Card>
  );
}
