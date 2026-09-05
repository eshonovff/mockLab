"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

// Shared by the root and dashboard `loading.tsx` files (task 9.3) — both are the same generic
// route-level Suspense fallback, with no page-specific shape to skeleton against (this fires
// for many different page types under each segment), so a plain centered spinner is the
// pragmatic choice rather than a bespoke skeleton per route.
//
// Client Component, not a `getTranslations` server call — `loading.tsx` receives no `params`
// at all (Next.js never passes route params to it), so there's no locale to resolve messages
// against server-side. A server-side dynamic API call here (which `getTranslations` is) forces
// the *entire* enclosing route segment out of static rendering, since Next can no longer treat
// pages under it as static — confirmed by `next build`'s route table collapsing every `[locale]`
// page from prerendered (●) to fully dynamic (ƒ) the moment this was a server component calling
// `getTranslations`. `useTranslations` reads from the `NextIntlClientProvider` context the
// ancestor layout already sets up client-side instead, which doesn't have that effect.
export function RouteLoading() {
  const t = useTranslations("common");

  return (
    <div role="status" className="flex min-h-[60vh] items-center justify-center">
      <Loader2Icon className="text-ink-muted size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
