"use client";

import { RotateCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DialogForm } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeLabels, locales } from "@/lib/locales";

export function ResourceSettings({
  count,
  locale,
  seed,
  resetOpen,
  resetting,
  onCountChange,
  onLocaleChange,
  onRegenerateSeed,
  onResetOpenChange,
  onReset,
}: {
  count: number;
  locale: string;
  seed: string;
  resetOpen: boolean;
  resetting: boolean;
  onCountChange: (count: number) => void;
  onLocaleChange: (locale: string) => void;
  onRegenerateSeed: () => void;
  onResetOpenChange: (open: boolean) => void;
  onReset: () => void;
}) {
  const t = useTranslations("builder");

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      <h2 className="text-h3 text-ink">{t("settings.title")}</h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resource-count">{t("settings.count")}</Label>
        <Input
          id="resource-count"
          type="number"
          min={1}
          value={count}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value > 0) onCountChange(Math.floor(value));
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resource-locale">{t("settings.locale")}</Label>
        <Select value={locale} onValueChange={onLocaleChange}>
          <SelectTrigger id="resource-locale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((code) => (
              <SelectItem key={code} value={code}>
                {localeLabels[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resource-seed">{t("settings.seed")}</Label>
        <div className="flex items-center gap-2">
          <code
            id="resource-seed"
            className="flex-1 truncate rounded-control border border-line bg-muted/50 px-3 py-2 font-mono text-caption text-ink-muted"
          >
            {seed}
          </code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={t("settings.regenerateSeed")}
            onClick={onRegenerateSeed}
          >
            <RotateCwIcon aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-4">
        <Label>{t("settings.resetTrigger")}</Label>
        <DialogForm
          open={resetOpen}
          onOpenChange={onResetOpenChange}
          trigger={
            <Button type="button" variant="secondary" className="w-fit">
              {t("settings.resetTrigger")}
            </Button>
          }
          title={t("settings.resetTitle")}
          confirmText={t("settings.resetConfirm")}
          destructive
          loading={resetting}
          onConfirm={onReset}
        >
          <p className="text-caption text-ink-muted">{t("settings.resetDescription")}</p>
        </DialogForm>
      </div>
    </div>
  );
}
