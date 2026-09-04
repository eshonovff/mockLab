import { describe, expect, it } from "vitest";

import { buildMetadata } from "./metadata";

describe("buildMetadata", () => {
  it("builds a canonical URL from the locale and path", () => {
    const metadata = buildMetadata({
      locale: "ru",
      path: "/docs/quick-start",
      title: "Быстрый старт",
      description: "Пять минут до рабочего эндпоинта.",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/ru/docs/quick-start");
  });

  it("includes alternates.languages for all six locales plus x-default pointing at English", () => {
    const metadata = buildMetadata({
      locale: "en",
      path: "/docs/quick-start",
      title: "Quick start",
      description: "Five minutes to a live endpoint.",
    });

    const languages = metadata.alternates?.languages as Record<string, string>;
    expect(languages.en).toBe("http://localhost:3000/en/docs/quick-start");
    expect(languages.tg).toBe("http://localhost:3000/tg/docs/quick-start");
    expect(languages.ru).toBe("http://localhost:3000/ru/docs/quick-start");
    expect(languages.uz).toBe("http://localhost:3000/uz/docs/quick-start");
    expect(languages.ky).toBe("http://localhost:3000/ky/docs/quick-start");
    expect(languages.kk).toBe("http://localhost:3000/kk/docs/quick-start");
    expect(languages["x-default"]).toBe("http://localhost:3000/en/docs/quick-start");
  });

  it("handles the empty path for the home page", () => {
    const metadata = buildMetadata({
      locale: "en",
      path: "",
      title: "MockLab",
      description: "Fake REST APIs without record limits.",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/en");
  });

  it("carries title/description through to openGraph and twitter", () => {
    const metadata = buildMetadata({
      locale: "en",
      path: "/docs/faq",
      title: "FAQ",
      description: "Answers to common questions.",
    });

    expect(metadata.openGraph?.title).toBe("FAQ");
    expect(metadata.openGraph?.description).toBe("Answers to common questions.");
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "FAQ",
      description: "Answers to common questions.",
    });
  });

  it("sets robots to noindex,nofollow only when noindex is requested", () => {
    const indexable = buildMetadata({ locale: "en", path: "/docs", title: "t", description: "d" });
    expect(indexable.robots).toBeUndefined();

    const noindexed = buildMetadata({
      locale: "en",
      path: "/dashboard",
      title: "t",
      description: "d",
      noindex: true,
    });
    expect(noindexed.robots).toEqual({ index: false, follow: false });
  });
});
