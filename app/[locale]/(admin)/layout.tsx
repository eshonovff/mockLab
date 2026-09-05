import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { RailNav } from "@/components/shell/rail-nav";
import { TopBar } from "@/components/shell/top-bar";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/locales";

// CLAUDE.md §8.1: "Dashboard and admin are noindex." Same reasoning as (app)/layout.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
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
    const pathname = headersList.get("x-pathname") ?? `/${locale}/admin`;
    return redirect({
      href: { pathname: "/login", query: { next: pathname } },
      locale: locale as Locale,
    });
  }

  // 404, not 403 — don't advertise that the admin panel exists to non-admins.
  if (session.role !== "ADMIN") {
    notFound();
  }

  // Same shell as (app) — CLAUDE.md §8.2: "Same design system" — with the rail's Admin item
  // always on here (an admin looking at their own panel already knows it exists).
  return (
    <QueryProvider>
      <div className="bg-canvas flex min-h-dvh gap-4 p-4">
        <aside className="bg-rail sticky top-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 rounded-card lg:block">
          <RailNav isAdmin />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar isAdmin />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
