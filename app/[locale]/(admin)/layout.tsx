import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/locales";
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

  return <>{children}</>;
}
