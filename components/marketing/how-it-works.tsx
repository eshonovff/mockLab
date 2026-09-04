import { useTranslations } from "next-intl";

const STEPS = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
  const t = useTranslations("home.steps");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-h2 text-ink">{t("title")}</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6"
          >
            <span className="flex size-8 items-center justify-center rounded-pill bg-accent-soft text-caption font-medium text-accent">
              {index + 1}
            </span>
            <h3 className="text-h3 text-ink">{t(`${step}.title`)}</h3>
            <p className="text-caption text-ink-muted">{t(`${step}.body`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
