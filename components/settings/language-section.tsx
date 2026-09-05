"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeLabels, locales } from "@/lib/locales";
import { cn } from "@/lib/utils";

// Persists the choice to `User.locale` (PATCH /api/auth/me) *and* switches the UI immediately,
// same as the top-bar `LocaleSwitcher` — a "language" setting that only stored a preference
// without visibly changing anything would just look broken.
export function LanguageSection() {
  const t = useTranslations("settings.language");
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleSelect(code: (typeof locales)[number]) {
    if (code === activeLocale) return;
    setPending(code);

    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: code }),
    }).catch(() => null);

    router.replace(pathname, { locale: code });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {locales.map((code) => {
            const active = code === activeLocale;
            return (
              <button
                key={code}
                type="button"
                disabled={pending !== null}
                onClick={() => handleSelect(code)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-control border px-3 py-2 text-caption transition-colors",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink hover:bg-muted",
                  pending !== null && "opacity-50",
                )}
              >
                {localeLabels[code]}
                {active && <CheckIcon className="size-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
