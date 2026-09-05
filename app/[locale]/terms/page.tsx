import type { Metadata } from "next";

import { LegalPageBody } from "@/components/legal/legal-page-body";
import { routing } from "@/i18n/routing";
import { getLegalPage } from "@/lib/legal/content";
import type { Locale } from "@/lib/locales";
import { buildMetadata } from "@/lib/seo/metadata";

type RouteParams = { locale: string };

// Statically rendered over all six locales (CLAUDE.md §8.1) — a fixed page, not an open-ended
// collection like docs, so there's no slug loop here at all.
export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getLegalPage(locale as Locale, "terms");

  return buildMetadata({
    locale: locale as Locale,
    path: "/terms",
    title: page.title,
    description: page.description,
  });
}

export default async function TermsPage({ params }: { params: Promise<RouteParams> }) {
  const { locale } = await params;
  return <LegalPageBody locale={locale as Locale} slug="terms" />;
}
