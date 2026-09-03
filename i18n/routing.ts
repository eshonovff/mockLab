import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "@/lib/locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
