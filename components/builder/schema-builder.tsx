"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { previewSchema, updateResource } from "@/components/builder/api";
import {
  createDraftField,
  DEFAULT_FIELD_OPTIONS,
  dehydrateDraftFields,
  hydrateDraftFields,
  type DraftField,
  type PersistedField,
} from "@/components/builder/field-defaults";
import { FieldRow } from "@/components/builder/field-row";
import { PreviewTable } from "@/components/builder/preview-table";
import { ResourceSettings } from "@/components/builder/resource-settings";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Link } from "@/i18n/navigation";
import type { ResourceDto } from "@/lib/dto";
import type { FieldType } from "@/lib/generator/field-types";
import { generateResourceSeed } from "@/lib/ids";
import { FIELD_NAME_PATTERN, MAX_SCHEMA_FIELDS, resourceSchemaSchema } from "@/lib/validators";

const PREVIEW_DEBOUNCE_MS = 400;

type Draft = {
  fields: DraftField[];
  locale: string;
  count: number;
};

type FullDraft = Draft & { seed: string };

function serialize(fields: DraftField[]): string {
  return JSON.stringify(dehydrateDraftFields(fields));
}

function fullDraftsEqual(a: FullDraft, b: FullDraft): boolean {
  return (
    a.locale === b.locale &&
    a.count === b.count &&
    a.seed === b.seed &&
    serialize(a.fields) === serialize(b.fields)
  );
}

/** `undefined` (no error), or a translation-key suffix for `builder.field.errors.*`. */
function computeNameErrors(fields: DraftField[]): Record<string, "pattern" | "duplicate"> {
  const errors: Record<string, "pattern" | "duplicate"> = {};
  const firstKeyForName = new Map<string, string>();

  for (const field of fields) {
    if (!FIELD_NAME_PATTERN.test(field.name)) {
      errors[field._key] = "pattern";
      continue;
    }
    const earlierKey = firstKeyForName.get(field.name);
    if (earlierKey !== undefined) {
      errors[field._key] = "duplicate";
      errors[earlierKey] = "duplicate";
    } else {
      firstKeyForName.set(field.name, field._key);
    }
  }

  return errors;
}

export function SchemaBuilder({ initialResource }: { initialResource: ResourceDto }) {
  const t = useTranslations("builder");

  const [draft, setDraft] = useState<Draft>(() => ({
    fields: hydrateDraftFields(initialResource.schema.fields),
    locale: initialResource.schema.locale ?? "en",
    count: initialResource.count,
  }));
  const [seed, setSeed] = useState(initialResource.seed);

  const lastSavedRef = useRef<FullDraft>({ ...draft, seed });

  const debouncedFields = useDebouncedValue(draft.fields, PREVIEW_DEBOUNCE_MS);
  const debouncedLocale = useDebouncedValue(draft.locale, PREVIEW_DEBOUNCE_MS);
  const debouncedCount = useDebouncedValue(draft.count, PREVIEW_DEBOUNCE_MS);
  const debouncedSeed = useDebouncedValue(seed, PREVIEW_DEBOUNCE_MS);

  const updateMutation = useMutation({
    mutationFn: (input: {
      schema: { fields: PersistedField[]; locale: string };
      count: number;
      seed: string;
    }) => updateResource(initialResource.id, input),
    onError: () => toast.error(t("toasts.saveError")),
  });

  function persistNow(nextDraft: Draft, nextSeed: string, opts?: { onError?: () => void }) {
    const persistedFields = dehydrateDraftFields(nextDraft.fields);
    const validation = resourceSchemaSchema.safeParse({
      fields: persistedFields,
      locale: nextDraft.locale,
    });
    // An in-progress edit (a half-typed field name, a momentary duplicate mid-rename) shouldn't
    // be pushed to the server as a guaranteed 400 — silently skip until it settles into something
    // valid. Inline errors (computeNameErrors) already show the user what's wrong.
    if (!validation.success) return;

    lastSavedRef.current = { ...nextDraft, seed: nextSeed };
    updateMutation.mutate(
      {
        schema: { fields: persistedFields, locale: nextDraft.locale },
        count: nextDraft.count,
        seed: nextSeed,
      },
      { onError: opts?.onError },
    );
  }

  // Autosave: fires 400ms after fields/locale/count/seed settle, for continuous edits (typing a
  // name, adjusting count, editing options). Discrete actions (add/remove/reorder/type
  // change/locale/regenerate) call persistNow directly below and update lastSavedRef themselves,
  // so this effect sees no diff left to save when it eventually fires for the same change.
  useEffect(() => {
    const debouncedFull: FullDraft = {
      fields: debouncedFields,
      locale: debouncedLocale,
      count: debouncedCount,
      seed: debouncedSeed,
    };
    if (fullDraftsEqual(debouncedFull, lastSavedRef.current)) return;

    const persistedFields = dehydrateDraftFields(debouncedFields);
    const validation = resourceSchemaSchema.safeParse({
      fields: persistedFields,
      locale: debouncedLocale,
    });
    if (!validation.success) return;

    lastSavedRef.current = debouncedFull;
    updateMutation.mutate({
      schema: { fields: persistedFields, locale: debouncedLocale },
      count: debouncedCount,
      seed: debouncedSeed,
    });
    // updateMutation is intentionally omitted — useMutation returns a new object identity every
    // render, and it's not part of the "did the draft settle to something new" condition this
    // effect actually watches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFields, debouncedLocale, debouncedCount, debouncedSeed]);

  // Live preview — the same debounced values driving autosave (CLAUDE.md §4.6: "refreshed with
  // a 400ms debounce against the preview endpoint").
  const previewQuery = useQuery({
    queryKey: ["schema-preview", serialize(debouncedFields), debouncedLocale, debouncedSeed],
    queryFn: () =>
      previewSchema({
        schema: { fields: dehydrateDraftFields(debouncedFields) },
        seed: debouncedSeed,
        locale: debouncedLocale,
      }),
  });

  const nameErrors = computeNameErrors(draft.fields);

  function handleAddField() {
    const newField = createDraftField(draft.fields.map((field) => field.name));
    const nextDraft = { ...draft, fields: [...draft.fields, newField] };
    setDraft(nextDraft);
    persistNow(nextDraft, seed);
  }

  function handleRemoveField(key: string) {
    const nextDraft = { ...draft, fields: draft.fields.filter((field) => field._key !== key) };
    setDraft(nextDraft);
    persistNow(nextDraft, seed);
  }

  function handleMoveField(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= draft.fields.length) return;

    const previousFields = draft.fields;
    const nextFields = [...draft.fields];
    const [moved] = nextFields.splice(fromIndex, 1);
    if (!moved) return;
    nextFields.splice(toIndex, 0, moved);

    const nextDraft = { ...draft, fields: nextFields };
    setDraft(nextDraft); // optimistic — the new order is on screen immediately.
    persistNow(nextDraft, seed, {
      onError: () => {
        setDraft((prev) => ({ ...prev, fields: previousFields })); // roll back on failure.
        toast.error(t("toasts.reorderError"));
      },
    });
  }

  function handleFieldNameChange(key: string, name: string) {
    setDraft((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field._key === key ? { ...field, name } : field)),
    }));
  }

  function handleFieldTypeChange(key: string, type: FieldType) {
    const nextFields = draft.fields.map((field): DraftField =>
      field._key === key
        ? ({
            _key: field._key,
            name: field.name,
            type,
            options: DEFAULT_FIELD_OPTIONS[type],
          } as DraftField)
        : field,
    );
    const nextDraft = { ...draft, fields: nextFields };
    setDraft(nextDraft);
    persistNow(nextDraft, seed);
  }

  function handleFieldOptionsChange(key: string, options: unknown) {
    setDraft((prev) => ({
      ...prev,
      // `options` always matches this field's own type — FieldOptionsPopover only ever
      // constructs it via the branch for field.type, never a different type's shape.
      fields: prev.fields.map((field) =>
        field._key === key ? ({ ...field, options } as DraftField) : field,
      ),
    }));
  }

  function handleLocaleChange(locale: string) {
    const nextDraft = { ...draft, locale };
    setDraft(nextDraft);
    persistNow(nextDraft, seed);
  }

  function handleCountChange(count: number) {
    setDraft((prev) => ({ ...prev, count }));
  }

  function handleRegenerateSeed() {
    const nextSeed = generateResourceSeed();
    setSeed(nextSeed);
    persistNow(draft, nextSeed);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/projects/${initialResource.projectId}`}
          className="inline-flex w-fit items-center gap-1 text-caption text-ink-muted hover:text-ink"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          {t("backToProject")}
        </Link>
        <h1 className="text-display text-ink">{initialResource.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 text-ink">{t("fields.title")}</h2>
            <span className="text-caption text-ink-muted">
              {draft.fields.length}/{MAX_SCHEMA_FIELDS}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {draft.fields.length === 0 && (
              <p className="text-caption text-ink-muted">{t("fields.empty")}</p>
            )}
            {draft.fields.map((field, index) => (
              <FieldRow
                key={field._key}
                field={field}
                index={index}
                isFirst={index === 0}
                isLast={index === draft.fields.length - 1}
                nameError={
                  nameErrors[field._key] ? t(`field.errors.${nameErrors[field._key]}`) : undefined
                }
                onNameChange={(name) => handleFieldNameChange(field._key, name)}
                onTypeChange={(type) => handleFieldTypeChange(field._key, type)}
                onOptionsChange={(options) => handleFieldOptionsChange(field._key, options)}
                onRemove={() => handleRemoveField(field._key)}
                onMove={handleMoveField}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            startIcon={<PlusIcon aria-hidden="true" />}
            onClick={handleAddField}
            disabled={draft.fields.length >= MAX_SCHEMA_FIELDS}
            className="w-fit"
          >
            {t("fields.addField")}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <h2 className="text-h3 text-ink">{t("preview.title")}</h2>
            <PreviewTable
              records={previewQuery.data ?? []}
              isFetching={previewQuery.isFetching}
              isError={previewQuery.isError}
            />
          </div>

          <ResourceSettings
            count={draft.count}
            locale={draft.locale}
            seed={seed}
            onCountChange={handleCountChange}
            onLocaleChange={handleLocaleChange}
            onRegenerateSeed={handleRegenerateSeed}
          />
        </div>
      </div>
    </div>
  );
}
