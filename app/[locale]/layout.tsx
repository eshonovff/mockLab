import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { brand } from "@/lib/brand";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/locales";

import "../globals.css";

// Cyrillic + cyrillic-ext cover tg/ru/ky/kk; latin covers en/uz.
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// `metadataBase` is a one-time root-level concern (task 7.1): resolves any relative URL a page's
// own metadata might set (an og:image path, for instance) against the real site origin instead
// of Next's own localhost default. `lib/seo/metadata.ts`'s `buildMetadata` always builds fully
// qualified URLs itself, so nothing downstream actually depends on this — it's here so a future
// page that doesn't go through that helper still resolves correctly instead of silently pointing
// at `localhost`.
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: brand.name,
  description: brand.tagline.en,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale as Locale);

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <NextIntlClientProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
