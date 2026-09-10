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
import { useLocale, useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { FieldTypeCard } from "@/components/marketing/field-type-card";
import { Link } from "@/i18n/navigation";
import { getFieldTypeSamples, type FieldTypeKey } from "@/lib/marketing/field-samples";

// A curated ~10 of the 22 real field types (lib/generator/field-types.ts) — the full reference
// table already lives in the docs (/docs/schema-and-field-types); this is a showcase, not a
// duplicate of it.
const FIELD_TYPES: { key: FieldTypeKey; icon: ComponentType<{ className?: string }> }[] = [
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
  const locale = useLocale();
  const samples = getFieldTypeSamples(locale);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-ink">{t("title")}</h2>
        <p className="text-body text-ink-muted">{t("subtitle")}</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {FIELD_TYPES.map(({ key, icon: Icon }) => (
          <FieldTypeCard
            key={key}
            label={t(`${key}.label`)}
            icon={<Icon className="size-4 text-accent" aria-hidden="true" />}
            samples={samples[key]}
          />
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
