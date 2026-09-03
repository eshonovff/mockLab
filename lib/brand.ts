type BrandLocale = "en" | "tg" | "ru" | "uz" | "ky" | "kk";

export const brand = {
  name: "MockLab",
  shortName: "MockLab",
  domain: "mocklab.dev",
  email: "hello@mocklab.dev",
  github: "https://github.com/mocklab/mocklab",
  tagline: {
    en: "Fake REST APIs without record limits",
    tg: "API-и сохтаи REST бе маҳдудияти шумораи сабтҳо",
    ru: "Фейковый REST API без ограничения количества записей",
    uz: "Yozuvlar soniga cheklovsiz soxta REST API",
    ky: "Жазуулардын санына чек коюлбаган жасалма REST API",
    kk: "Жазба санына шектеу қойылмаған жалған REST API",
  } satisfies Record<BrandLocale, string>,
} as const;
