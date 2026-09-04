import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const ITEMS = ["backend", "limit", "edits", "cors", "free", "locale"] as const;

// Native <details>/<summary> — expand/collapse with zero client JS, per task 7.2's "no client
// component beyond the demo widget." The FAQPage JSON-LD emitted alongside this on the page
// (lib/seo/jsonld.ts, task 7.1) has to match this exact visible Q&A content.
export function Faq() {
  const t = useTranslations("home.faq");

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="text-h2 text-ink">{t("title")}</h2>
      <div className="mt-8 flex flex-col gap-3">
        {ITEMS.map((item) => (
          <details
            key={item}
            className="group rounded-card border border-line bg-surface p-5 open:pb-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium text-ink">
              {t(`items.${item}.question`)}
              <ChevronDownIcon
                className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 text-caption text-ink-muted">{t(`items.${item}.answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
