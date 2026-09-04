import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// The one promoted dark moment on this page (CLAUDE.md §6) — everywhere else stays white/quiet.
export function FinalCta() {
  const t = useTranslations("home.cta");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-card bg-rail p-10 text-center sm:p-16">
        <h2 className="text-h2 text-surface">{t("title")}</h2>
        <p className="max-w-xl text-body text-surface/70">{t("subtitle")}</p>
        <Button
          asChild
          variant="secondary"
          size="lg"
          className="mt-2 w-fit bg-surface text-ink hover:bg-surface/90"
        >
          <Link href="/register">{t("button")}</Link>
        </Button>
      </div>
    </section>
  );
}
