"use client";

import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { FIELD_TYPE_OPTIONS, type DraftField } from "@/components/builder/field-defaults";
import { FieldOptionsPopover } from "@/components/builder/field-options-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldType } from "@/lib/generator/field-types";
import { cn } from "@/lib/utils";

type FieldRowProps = {
  field: DraftField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  nameError?: string;
  onNameChange: (name: string) => void;
  onTypeChange: (type: FieldType) => void;
  onOptionsChange: (options: unknown) => void;
  onRemove: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

export function FieldRow({
  field,
  index,
  isFirst,
  isLast,
  nameError,
  onNameChange,
  onTypeChange,
  onOptionsChange,
  onRemove,
  onMove,
}: FieldRowProps) {
  const t = useTranslations("builder");

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(index));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const fromIndex = Number(event.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(fromIndex) && fromIndex !== index) onMove(fromIndex, index);
      }}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface p-2",
        nameError && "border-destructive",
      )}
    >
      <span
        className="flex cursor-grab items-center text-ink-muted active:cursor-grabbing"
        aria-hidden="true"
      >
        <GripVerticalIcon className="size-4" />
      </span>

      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("field.moveUp")}
          disabled={isFirst}
          onClick={() => onMove(index, index - 1)}
          className="size-5"
        >
          <ChevronUpIcon aria-hidden="true" className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("field.moveDown")}
          disabled={isLast}
          onClick={() => onMove(index, index + 1)}
          className="size-5"
        >
          <ChevronDownIcon aria-hidden="true" className="size-3" />
        </Button>
      </div>

      {/* basis-full forces the type/options/remove group onto its own line below the name on
          narrow screens (flex-wrap), instead of squeezing the name input toward zero width —
          confirmed the squeeze was a real bug via a real 375px screenshot, not assumed fixed. */}
      <div className="flex min-w-40 flex-1 basis-full flex-col gap-1 sm:basis-auto">
        <Input
          value={field.name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label={t("field.nameLabel")}
          aria-invalid={!!nameError}
          className="font-mono"
        />
        {nameError && <p className="text-caption text-badge-rose-fg">{nameError}</p>}
      </div>

      <Select value={field.type} onValueChange={(value) => onTypeChange(value as FieldType)}>
        <SelectTrigger aria-label={t("field.typeLabel")} className="w-40 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPE_OPTIONS.map((type) => (
            <SelectItem key={type} value={type}>
              {t(`fieldTypes.${type}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FieldOptionsPopover field={field} onChange={onOptionsChange} />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={t("field.remove", { field: field.name })}
        onClick={onRemove}
        className="ml-auto sm:ml-0"
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>
  );
}
