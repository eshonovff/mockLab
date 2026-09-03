import { useTranslations } from "next-intl";

// Placeholder — replaced by the real projects grid in task 4.2. This page exists so the
// dashboard shell (task 1.3) has a route to render inside.
export default function DashboardPage() {
  const t = useTranslations("shell");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-display text-ink">{t("dashboard")}</h1>
    </div>
  );
}
