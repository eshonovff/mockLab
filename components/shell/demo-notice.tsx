import { InfoIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { brand } from "@/lib/brand";

// CLAUDE.md §9.2: "a visible notice on the dashboard: this is a demo service, do not store real
// or personal data, no durability guarantee." Plain server component (no "use client") — static
// text needs no interactivity, and the (app) layout that renders this is already an async
// Server Component itself.
export async function DemoNotice() {
  const t = await getTranslations("shell");

  return (
    <div className="bg-badge-amber-bg text-badge-amber-fg mb-6 flex items-center gap-2 rounded-control px-4 py-2.5 text-caption">
      <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
      <p>{t("demoNotice", { brand: brand.name })}</p>
    </div>
  );
}
