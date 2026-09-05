import { getTranslations } from "next-intl/server";

import { StateMessage } from "@/components/shell/state-message";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errorPages");

  return (
    <StateMessage
      title={t("notFound.title")}
      description={t("notFound.description")}
      action={
        <Button asChild>
          <Link href="/">{t("backHome")}</Link>
        </Button>
      }
    />
  );
}
