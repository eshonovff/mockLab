import { useTranslations } from "next-intl";

import { brand } from "@/lib/brand";

export default function Home() {
  const t = useTranslations("common");

  return (
    <main>
      <h1>{brand.name}</h1>
      <p>{t("appName")}</p>
    </main>
  );
}
