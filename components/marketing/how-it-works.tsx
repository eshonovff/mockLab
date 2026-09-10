import { useTranslations } from "next-intl";

import { RevealOnView } from "@/components/marketing/reveal-on-view";
import { cn } from "@/lib/utils";

const STEPS = ["step1", "step2", "step3"] as const;

// Tailwind's scanner needs each class name literally present in source (a template-built
// `delay-${n}` string won't be picked up), so the per-step stagger is a fixed lookup instead of
// a computed value — fine here since STEPS never grows past three.
const ENTRANCE_DELAY = ["delay-0", "delay-100", "delay-200"] as const;

export function HowItWorks() {
  const t = useTranslations("home.steps");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-h2 text-ink">{t("title")}</h2>
      <RevealOnView className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "flex flex-col gap-3 rounded-card border border-line bg-surface p-6 opacity-100 transition-all duration-500 ease-out",
              "group-data-[reveal=hidden]/reveal:translate-y-3 group-data-[reveal=hidden]/reveal:opacity-0",
              ENTRANCE_DELAY[index],
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-pill bg-accent-soft text-caption font-medium text-accent">
              {index + 1}
            </span>
            <h3 className="text-h3 text-ink">{t(`${step}.title`)}</h3>
            <p className="text-caption text-ink-muted">{t(`${step}.body`)}</p>
          </div>
        ))}
      </RevealOnView>
    </section>
  );
}
