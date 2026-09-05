import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/marketing/brand-mark";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Fully static — no interactivity, so no "use client" — matching task 7.2's "no client
// component beyond the demo widget."
export function MarketingHeader() {
  const t = useTranslations("home.header");

  return (
    <header className="bg-canvas sticky top-0 z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
      <Link href="/" className="text-ink">
        <BrandMark className="h-10 w-auto" />
      </Link>
      <nav className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/docs">{t("docs")}</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t("logIn")}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">{t("getStarted")}</Link>
        </Button>
      </nav>
    </header>
  );
}
