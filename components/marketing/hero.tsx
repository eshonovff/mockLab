import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { HeroDemo } from "@/components/marketing/hero-demo";
import { RecordStream } from "@/components/marketing/record-stream";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { DEMO_PROJECT_KEY, DEMO_RESOURCE_NAME } from "@/lib/demo";
import { env } from "@/lib/env";

export function Hero() {
  const t = useTranslations("home.hero");
  const requestPath = `/m/${DEMO_PROJECT_KEY}/${DEMO_RESOURCE_NAME}?limit=3`;
  const fullUrl = `${env.NEXT_PUBLIC_SITE_URL}${requestPath}`;

  return (
    <section className="relative overflow-hidden">
      <RecordStream />
      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        {/* bg-canvas/90 (not bg-surface, no border): a soft patch of "solid ground" under the
            headline against the record-stream texture behind it, not a second card. Sized by
            its own content, so it protects legibility regardless of how long a locale's
            headline/subhead run (RU/TG are notably longer than EN) rather than guessing a fixed
            height in the background layer itself. */}
        <div className="flex flex-col gap-6 rounded-card bg-canvas/90 py-2">
          <h1 className="text-display text-ink">{t("headline")}</h1>
          <p className="text-body text-ink-muted">{t("subheadline")}</p>
          <Button asChild size="lg" className="w-fit">
            <Link href="/register">
              {t("cta")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <HeroDemo requestPath={requestPath} fullUrl={fullUrl} />
      </div>
    </section>
  );
}
