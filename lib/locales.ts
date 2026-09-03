export const locales = ["en", "tg", "ru", "uz", "ky", "kk"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  tg: "Тоҷикӣ",
  ru: "Русский",
  uz: "Oʻzbekcha",
  ky: "Кыргызча",
  kk: "Қазақша",
};
