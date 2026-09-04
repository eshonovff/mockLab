import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Comparison } from "@/components/marketing/comparison";
import { Faq } from "@/components/marketing/faq";
import { FieldTypeGrid } from "@/components/marketing/field-type-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/locales";
import {
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  serializeJsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

type RouteParams = { locale: string };

// Statically rendered over all six locales (CLAUDE.md §8.1) — the marketing home page has no
// per-visitor data of its own; the hero's live demo is a client-side fetch against a fixed,
// pre-provisioned resource (`prisma/seed.ts`), not something this page needs to render per
// request.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.meta" });

  return buildMetadata({
    locale: locale as Locale,
    path: "",
    title: t("title"),
    description: t("description"),
  });
}

const FAQ_ITEM_KEYS = ["backend", "limit", "edits", "cors", "free", "locale"] as const;

export default async function HomePage({ params }: { params: Promise<RouteParams> }) {
  const { locale } = await params;
  const t = await getTranslations("home");

  // CLAUDE.md §8.5: "SoftwareApplication on the home page of each locale ... FAQPage on the home
  // FAQ block" — the two `lib/seo/jsonld.ts` builders task 7.1 built but left unwired, since
  // this is the first page with real content for them to describe.
  const softwareApplicationJsonLd = buildSoftwareApplicationJsonLd({
    locale: locale as Locale,
    url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}`,
    description: t("meta.description"),
  });
  const faqPageJsonLd = buildFaqPageJsonLd(
    FAQ_ITEM_KEYS.map((key) => ({
      question: t(`faq.items.${key}.question`),
      answer: t(`faq.items.${key}.answer`),
    })),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqPageJsonLd) }}
      />
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <FieldTypeGrid />
        <Comparison />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
