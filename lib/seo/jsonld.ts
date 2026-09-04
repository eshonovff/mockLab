import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/locales";

/**
 * `JSON.stringify` alone isn't safe to drop into a `<script>` body via `dangerouslySetInnerHTML`
 * — a literal less-than character in the data (most realistically inside a title or
 * description) can form a closing `</script>` sequence a browser's HTML parser acts on,
 * truncating the JSON and potentially running whatever HTML follows as markup. Replacing every
 * less-than character with its Unicode escape sidesteps that: identical parsed JSON value, no
 * literal less-than left for the HTML parser to see.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

/**
 * CLAUDE.md §8.5: "SoftwareApplication on the home page of each locale." Not yet wired into any
 * page — the home page itself is still a placeholder (task 7.2 builds the real one); this is
 * ready for that task to call directly.
 */
export function buildSoftwareApplicationJsonLd({
  locale,
  url,
  description,
}: {
  locale: Locale;
  url: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    description,
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    inLanguage: locale,
  };
}

/**
 * CLAUDE.md §8.5: "TechArticle ... on each docs page." Deliberately carries no
 * `datePublished`/`dateModified` — doc frontmatter (`lib/docs/frontmatter.ts`) only ever tracks
 * `title`/`description`/`order`, so there's no real date to report; inventing one would be
 * structured data Google's own guidelines treat as inaccurate, not a harmless placeholder.
 */
export function buildTechArticleJsonLd({
  locale,
  url,
  headline,
  description,
}: {
  locale: Locale;
  url: string;
  headline: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline,
    description,
    url,
    inLanguage: locale,
    author: { "@type": "Organization", name: brand.name },
  };
}

export type BreadcrumbItem = { name: string; url: string };

/** CLAUDE.md §8.5: "BreadcrumbList on each docs page." Generic — one caller per breadcrumb trail. */
export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type FaqItem = { question: string; answer: string };

/**
 * CLAUDE.md §8.5: "FAQPage on the home FAQ block." Not yet wired into any page for the same
 * reason as `buildSoftwareApplicationJsonLd` above — ready for task 7.2, which builds the FAQ
 * content this would describe. Structured data has to match visible page content, so this has
 * nothing real to point at until that content exists.
 */
export function buildFaqPageJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
