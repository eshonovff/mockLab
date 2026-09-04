import { useTranslations } from "next-intl";

import { brand } from "@/lib/brand";

const ROWS = ["limit", "storage", "writes", "determinism"] as const;

// Named generically ("typical fake-API tool"), not against a specific competitor by name — the
// comparison is real and specific in substance without being a trademark/branded comparison
// table.
export function Comparison() {
  const t = useTranslations("home.comparison");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-ink">{t("title")}</h2>
        <p className="max-w-2xl text-body text-ink-muted">{t("subtitle", { brand: brand.name })}</p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="p-4 text-caption font-medium text-ink-muted"></th>
              <th className="p-4 text-caption font-medium text-ink-muted">{t("typical")}</th>
              <th className="p-4 text-caption font-medium text-accent">
                {t("us", { brand: brand.name })}
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, index) => (
              <tr
                key={row}
                className={index < ROWS.length - 1 ? "border-b border-line" : undefined}
              >
                <th scope="row" className="p-4 text-caption font-medium text-ink">
                  {t(`rows.${row}.label`)}
                </th>
                <td className="p-4 text-caption text-ink-muted">{t(`rows.${row}.typical`)}</td>
                <td className="p-4 text-caption text-ink">{t(`rows.${row}.us`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
