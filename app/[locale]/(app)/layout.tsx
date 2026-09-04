import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { RailNav } from "@/components/shell/rail-nav";
import { TopBar } from "@/components/shell/top-bar";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/locales";

// CLAUDE.md §8.1: "Dashboard and admin are noindex." Applies to every route under this layout —
// no per-page title/description to build via `lib/seo/metadata.ts` (task 7.1), since none of
// these pages are meant to rank; this is the one metadata concern that actually applies here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? `/${locale}/dashboard`;
    return redirect({
      href: { pathname: "/login", query: { next: pathname } },
      locale: locale as Locale,
    });
  }

  return (
    <QueryProvider>
      <div className="bg-canvas flex min-h-dvh gap-4 p-4">
        <aside className="bg-rail sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 rounded-card lg:block">
          <RailNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
