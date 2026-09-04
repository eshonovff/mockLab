import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { DocPageMeta } from "@/lib/docs/content";

export function PrevNextLinks({
  previous,
  next,
}: {
  previous: DocPageMeta | null;
  next: DocPageMeta | null;
}) {
  const t = useTranslations("docs");

  if (!previous && !next) return null;

  return (
    <nav className="grid grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-2">
      {previous ? (
        <Link
          href={`/docs/${previous.slug}`}
          className="flex flex-col gap-1 rounded-control border border-line p-3 transition-colors hover:bg-muted/50"
        >
          <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
            <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
            {t("previous")}
          </span>
          <span className="text-body text-ink">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="flex flex-col items-end gap-1 rounded-control border border-line p-3 text-right transition-colors hover:bg-muted/50 sm:col-start-2"
        >
          <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
            {t("next")}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-body text-ink">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
