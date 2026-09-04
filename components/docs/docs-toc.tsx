import { useTranslations } from "next-intl";

import type { TocEntry } from "@/lib/docs/toc";

export function DocsToc({ toc }: { toc: TocEntry[] }) {
  const t = useTranslations("docs");

  if (toc.length === 0) return null;

  return (
    <nav aria-label={t("onThisPage")} className="flex flex-col gap-2">
      <p className="text-caption font-medium text-ink">{t("onThisPage")}</p>
      <ul className="flex flex-col gap-1.5">
        {toc.map((entry) => (
          <li key={entry.id} className={entry.depth === 3 ? "pl-3" : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-caption text-ink-muted transition-colors hover:text-ink"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
