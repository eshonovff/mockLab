import {
  BracesIcon,
  CalendarIcon,
  FingerprintIcon,
  ImageIcon,
  ListChecksIcon,
  MailIcon,
  MapPinIcon,
  TagIcon,
  ToggleLeftIcon,
  UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { Link } from "@/i18n/navigation";

// A curated ~10 of the 22 real field types (lib/generator/field-types.ts) — the full reference
// table already lives in the docs (/docs/schema-and-field-types); this is a showcase, not a
// duplicate of it.
const FIELD_TYPES: { key: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "uuid", icon: FingerprintIcon },
  { key: "fullName", icon: UserIcon },
  { key: "email", icon: MailIcon },
  { key: "price", icon: TagIcon },
  { key: "boolean", icon: ToggleLeftIcon },
  { key: "date", icon: CalendarIcon },
  { key: "enum", icon: ListChecksIcon },
  { key: "image", icon: ImageIcon },
  { key: "city", icon: MapPinIcon },
  { key: "template", icon: BracesIcon },
];

export function FieldTypeGrid() {
  const t = useTranslations("home.fieldTypes");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-ink">{t("title")}</h2>
        <p className="text-body text-ink-muted">{t("subtitle")}</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {FIELD_TYPES.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4"
          >
            <Icon className="size-4 text-accent" aria-hidden="true" />
            <code className="font-mono text-caption text-ink">{t(`${key}.label`)}</code>
            <span className="truncate font-mono text-caption text-ink-muted">
              {t(`${key}.example`)}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/docs/schema-and-field-types"
        className="mt-6 inline-block text-caption text-accent"
      >
        {t("viewAll")}
      </Link>
    </section>
  );
}
