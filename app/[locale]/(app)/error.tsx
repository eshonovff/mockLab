"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { StateMessage } from "@/components/shell/state-message";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPages");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateMessage
      title={t("error.title")}
      description={t("error.description")}
      action={
        <>
          <Button variant="secondary" onClick={reset}>
            {t("error.retry")}
          </Button>
          <Button asChild>
            <Link href="/dashboard">{t("backDashboard")}</Link>
          </Button>
        </>
      }
    />
  );
}
