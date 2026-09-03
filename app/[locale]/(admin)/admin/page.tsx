import { useTranslations } from "next-intl";

// Placeholder — replaced by the real admin panel in task 8.2. This page exists so the
// (admin) route group's guard (task 2.4) has a route to protect.
export default function AdminPage() {
  const t = useTranslations("shell");

  return (
    <main className="p-6">
      <h1 className="text-display text-ink">{t("admin")}</h1>
    </main>
  );
}
