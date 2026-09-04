import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CodeSnippetTabs, type SnippetKey } from "@/components/code-snippet-tabs";
import { CodeBlock } from "@/components/docs/code-block";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import { MobileNavToggle } from "@/components/docs/mobile-nav-toggle";
import { PrevNextLinks } from "@/components/docs/prev-next-links";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getDocPage, listDocPages } from "@/lib/docs/content";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/locales";
import {
  buildBreadcrumbListJsonLd,
  buildTechArticleJsonLd,
  serializeJsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

type RouteParams = { locale: string; slug?: string[] };

// Statically rendered over every locale × page (CLAUDE.md §8.1) — `slug: []` pre-renders the
// bare `/docs` route (redirected internally to the first page in sidebar order), one entry per
// real page pre-renders `/docs/{slug}`. Content is flat (`content/docs/{locale}/*.mdx`, one
// level deep per CLAUDE.md §6.1), so no slug array here is ever longer than one segment.
export async function generateStaticParams(): Promise<{ locale: string; slug: string[] }[]> {
  const params: { locale: string; slug: string[] }[] = [];

  for (const locale of routing.locales) {
    params.push({ locale, slug: [] });
    const pages = await listDocPages(locale);
    for (const page of pages) params.push({ locale, slug: [page.slug] });
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const pages = await listDocPages(locale as Locale);
  const activeSlug = slug?.[0] ?? pages[0]?.slug;
  const page = pages.find((candidate) => candidate.slug === activeSlug);
  if (!page) return {};

  // The bare `/docs` route and `/docs/{firstPageSlug}` render identical content — canonicalizing
  // both to the real slugged path (never `/docs` itself) avoids declaring two indexable URLs for
  // the same page.
  return buildMetadata({
    locale: locale as Locale,
    path: `/docs/${page.slug}`,
    title: page.title,
    description: page.description,
  });
}

export default async function DocsPage({ params }: { params: Promise<RouteParams> }) {
  const { locale, slug } = await params;
  const t = await getTranslations("docs");
  const tShell = await getTranslations("shell");
  const pages = await listDocPages(locale as Locale);

  if (pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-body text-ink-muted">{t("empty")}</p>
      </div>
    );
  }

  // Content is one level deep only (see generateStaticParams above) — anything longer is never
  // a real page.
  if (slug && slug.length > 1) notFound();

  const activeSlug = slug && slug.length > 0 ? slug[0]! : pages[0]!.slug;
  const page = await getDocPage(locale as Locale, activeSlug);
  if (!page) notFound();

  const activeIndex = pages.findIndex((candidate) => candidate.slug === activeSlug);
  const previous = activeIndex > 0 ? pages[activeIndex - 1]! : null;
  const next = activeIndex >= 0 && activeIndex < pages.length - 1 ? pages[activeIndex + 1]! : null;

  const { Component } = page;

  // CLAUDE.md §8.5: "TechArticle + BreadcrumbList on each docs page," emitted via a
  // <script type="application/ld+json"> in this server component — the page itself owns this,
  // `lib/seo/jsonld.ts` only supplies the plain data (task 7.1).
  const canonicalUrl = `${env.NEXT_PUBLIC_SITE_URL}/${locale}/docs/${page.slug}`;
  const techArticleJsonLd = buildTechArticleJsonLd({
    locale: locale as Locale,
    url: canonicalUrl,
    headline: page.title,
    description: page.description,
  });
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: t("home"), url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}` },
    { name: tShell("docs"), url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/docs` },
    { name: page.title, url: canonicalUrl },
  ]);

  // The doc-content wrapper for CodeSnippetTabs (task 6.4) — lets an .mdx file write just
  // `<CodeSnippetTabs snippets={{...}} />` with no copy-button strings of its own, reusing the
  // same `docs.*` translations CodeBlock's copy button already relies on. Defined per-request
  // inside this async Server Component (not module scope) since it closes over `t`.
  function DocsCodeSnippetTabs({ snippets }: { snippets: Record<SnippetKey, string> }) {
    return (
      <CodeSnippetTabs
        snippets={snippets}
        copyLabel={t("copyCode")}
        copiedToast={t("codeCopied")}
        errorToast={t("copyError")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(techArticleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Link
        href="/"
        className="mb-6 inline-flex w-fit items-center gap-1 text-caption text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        {t("backToHome")}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_200px]">
        <aside className="md:sticky md:top-6 md:h-fit">
          <MobileNavToggle label={t("menu")}>
            <DocsSidebar pages={pages} activeSlug={activeSlug} />
          </MobileNavToggle>
        </aside>

        <article className="flex min-w-0 flex-col gap-8">
          <h1 className="text-display text-ink">{page.title}</h1>
          <div className="docs-prose">
            <Component components={{ pre: CodeBlock, CodeSnippetTabs: DocsCodeSnippetTabs }} />
          </div>
          <PrevNextLinks previous={previous} next={next} />
        </article>

        <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit">
          <DocsToc toc={page.toc} />
        </aside>
      </div>
    </div>
  );
}
