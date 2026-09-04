import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { brand } from "@/lib/brand";
import { localeLabels, locales } from "@/lib/locales";

// Plain locale links, not the dashboard's dropdown `LocaleSwitcher` — that's a client component
// (task 6's `components/shell/locale-switcher.tsx`), and this page allows only one client
// component total (the hero demo). A static list of links to the same page in each locale needs
// no JS at all and is just as usable.
export function MarketingFooter() {
  const t = useTranslations("home.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-h3 text-ink">{brand.name}</span>
          <p className="text-caption text-ink-muted">{t("tagline")}</p>
        </div>

        <nav aria-label={t("language")} className="flex flex-wrap gap-x-3 gap-y-1">
          {locales.map((code) => (
            <Link
              key={code}
              href="/"
              locale={code}
              className="text-caption text-ink-muted hover:text-ink"
            >
              {localeLabels[code]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-ink-muted">{t("copyright", { year, brand: brand.name })}</p>
        <Link href="/docs" className="text-caption text-ink-muted hover:text-ink">
          {t("docs")}
        </Link>
      </div>
    </footer>
  );
}
