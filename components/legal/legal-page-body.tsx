import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { getLegalPage, type LegalSlug } from "@/lib/legal/content";
import type { Locale } from "@/lib/locales";

// Shared by `app/[locale]/terms/page.tsx` and `app/[locale]/privacy/page.tsx` — same shell
// (`MarketingHeader`/`MarketingFooter`, so a visitor can navigate back out) and same prose
// layout, differing only in which content file loads. Both stay fully static (neither Marketing
// component nor this one is a client component).
export async function LegalPageBody({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
  const { title, Component } = await getLegalPage(locale, slug);

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-display text-ink mb-8">{title}</h1>
        <div className="docs-prose">
          <Component />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
