import { getTranslations } from "next-intl/server";

import { StateMessage } from "@/components/shell/state-message";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Renders inside the (app) layout's shell (RailNav/TopBar/DemoNotice) — only the content below
// that layout resets, so the dashboard chrome stays in place around this.
export default async function DashboardNotFound() {
  const t = await getTranslations("errorPages");

  return (
    <StateMessage
      title={t("notFound.title")}
      description={t("notFound.description")}
      action={
        <Button asChild>
          <Link href="/dashboard">{t("backDashboard")}</Link>
        </Button>
      }
    />
  );
}
