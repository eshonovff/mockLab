import { SettingsClient } from "@/components/settings/settings-client";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/locales";

// The (app) layout (task 2.4) already redirects unauthenticated requests before this page ever
// renders — this re-check is cheap defense-in-depth, not the primary guard.
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) {
    return redirect({
      href: { pathname: "/login", query: { next: `/${locale}/dashboard/settings` } },
      locale: locale as Locale,
    });
  }

  return <SettingsClient initialName={session.name} email={session.email} />;
}
