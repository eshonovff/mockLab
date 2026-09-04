import { describe, expect, it } from "vitest";

import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  buildTechArticleJsonLd,
  serializeJsonLd,
} from "./jsonld";

describe("serializeJsonLd", () => {
  it("escapes every < so the output can never contain a literal </script>", () => {
    const serialized = serializeJsonLd({ title: "a</script><script>alert(1)</script>b" });

    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("round-trips through JSON.parse to the original value", () => {
    const original = { title: "Query parameters: field<value>", count: 3, nested: { ok: true } };
    const parsed: unknown = JSON.parse(serializeJsonLd(original));

    expect(parsed).toEqual(original);
  });
});

describe("buildSoftwareApplicationJsonLd", () => {
  it("produces a valid SoftwareApplication node", () => {
    const jsonLd = buildSoftwareApplicationJsonLd({
      locale: "en",
      url: "https://mocklab.dev/en",
      description: "Fake REST APIs without record limits.",
    });

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MockLab",
      url: "https://mocklab.dev/en",
      inLanguage: "en",
    });
  });
});

describe("buildTechArticleJsonLd", () => {
  it("produces a TechArticle node with no fabricated dates", () => {
    const jsonLd = buildTechArticleJsonLd({
      locale: "en",
      url: "https://mocklab.dev/en/docs/quick-start",
      headline: "Quick start",
      description: "Five minutes to a live endpoint.",
    });

    expect(jsonLd["@type"]).toBe("TechArticle");
    expect(jsonLd).not.toHaveProperty("datePublished");
    expect(jsonLd).not.toHaveProperty("dateModified");
  });
});

describe("buildBreadcrumbListJsonLd", () => {
  it("numbers items by position, starting at 1", () => {
    const jsonLd = buildBreadcrumbListJsonLd([
      { name: "Home", url: "https://mocklab.dev/en" },
      { name: "Docs", url: "https://mocklab.dev/en/docs" },
      { name: "Quick start", url: "https://mocklab.dev/en/docs/quick-start" },
    ]);

    expect(jsonLd.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://mocklab.dev/en" },
      { "@type": "ListItem", position: 2, name: "Docs", item: "https://mocklab.dev/en/docs" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Quick start",
        item: "https://mocklab.dev/en/docs/quick-start",
      },
    ]);
  });
});

describe("buildFaqPageJsonLd", () => {
  it("maps each item to a Question with an accepted Answer", () => {
    const jsonLd = buildFaqPageJsonLd([{ question: "Is it free?", answer: "Yes, for now." }]);

    expect(jsonLd.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Is it free?",
        acceptedAnswer: { "@type": "Answer", text: "Yes, for now." },
      },
    ]);
  });
});
