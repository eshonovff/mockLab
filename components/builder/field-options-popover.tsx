"use client";

import { PlusIcon, Settings2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DraftField } from "@/components/builder/field-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// These types carry zero configurable options (their zod schema is a literal `z.object({})`) —
// no popover is worth showing for them at all.
const EMPTY_OPTIONS_TYPES = new Set<DraftField["type"]>([
  "index",
  "uuid",
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "avatar",
  "city",
  "country",
  "street",
  "word",
]);

function numberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function OptionsFields({
  field,
  onChange,
}: {
  field: DraftField;
  onChange: (options: unknown) => void;
}) {
  const t = useTranslations("builder");

  switch (field.type) {
    case "image":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.width")}</Label>
            <Input
              type="number"
              min={1}
              value={field.options.width ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, width: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.height")}</Label>
            <Input
              type="number"
              min={1}
              value={field.options.height ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, height: numberOrUndefined(e.target.value) })
              }
            />
          </div>
        </div>
      );

    case "sentence":
    case "paragraph":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.min")}</Label>
            <Input
              type="number"
              min={1}
              value={field.options.min ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, min: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.max")}</Label>
            <Input
              type="number"
              min={1}
              value={field.options.max ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, max: numberOrUndefined(e.target.value) })
              }
            />
          </div>
        </div>
      );

    case "number":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.min")}</Label>
            <Input
              type="number"
              value={field.options.min ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, min: numberOrUndefined(e.target.value) })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.max")}</Label>
            <Input
              type="number"
              value={field.options.max ?? ""}
              onChange={(e) =>
                onChange({ ...field.options, max: numberOrUndefined(e.target.value) })
              }
            />
          </div>
        </div>
      );

    case "price":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("options.min")}</Label>
              <Input
                type="number"
                value={field.options.min ?? ""}
                onChange={(e) =>
                  onChange({ ...field.options, min: numberOrUndefined(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("options.max")}</Label>
              <Input
                type="number"
                value={field.options.max ?? ""}
                onChange={(e) =>
                  onChange({ ...field.options, max: numberOrUndefined(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.symbol")}</Label>
            <Input
              value={field.options.symbol ?? ""}
              onChange={(e) => onChange({ ...field.options, symbol: e.target.value || undefined })}
              placeholder="$"
            />
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{t("options.probability")}</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={field.options.probability ?? ""}
            onChange={(e) =>
              onChange({ ...field.options, probability: numberOrUndefined(e.target.value) })
            }
          />
        </div>
      );

    case "date":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.from")}</Label>
            <Input
              value={field.options.from ?? ""}
              onChange={(e) => onChange({ ...field.options, from: e.target.value || undefined })}
              placeholder="2020-01-01"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("options.to")}</Label>
            <Input
              value={field.options.to ?? ""}
              onChange={(e) => onChange({ ...field.options, to: e.target.value || undefined })}
              placeholder="2025-01-01"
            />
          </div>
        </div>
      );

    case "enum": {
      const values = field.options.values;
      return (
        <div className="flex flex-col gap-2">
          <Label>{t("options.values")}</Label>
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                value={value}
                onChange={(e) => {
                  const next = [...values];
                  next[index] = e.target.value;
                  onChange({ values: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={t("options.removeValue")}
                disabled={values.length <= 1}
                onClick={() => onChange({ values: values.filter((_, i) => i !== index) })}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            startIcon={<PlusIcon aria-hidden="true" />}
            onClick={() => onChange({ values: [...values, ""] })}
          >
            {t("options.addValue")}
          </Button>
        </div>
      );
    }

    case "static":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{t("options.value")}</Label>
          <Input
            value={typeof field.options.value === "string" ? field.options.value : ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      );

    case "template":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{t("options.template")}</Label>
          <Input
            value={field.options.template}
            onChange={(e) => onChange({ template: e.target.value })}
            placeholder="{{firstName}} {{lastName}}"
          />
          <p className="text-caption text-ink-muted">{t("options.templateHint")}</p>
        </div>
      );

    default:
      return null;
  }
}

export function FieldOptionsPopover({
  field,
  onChange,
}: {
  field: DraftField;
  onChange: (options: unknown) => void;
}) {
  const t = useTranslations("builder");

  if (EMPTY_OPTIONS_TYPES.has(field.type)) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("options.trigger", { field: field.name })}
        >
          <Settings2Icon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <OptionsFields field={field} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
