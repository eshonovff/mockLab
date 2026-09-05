"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileSchema } from "@/lib/validators";

const profileFormSchema = updateProfileSchema.pick({ name: true });

export function ProfileForm({
  name,
  onSaved,
}: {
  name: string | null;
  onSaved: (name: string | null) => void;
}) {
  const t = useTranslations("settings.profile");
  const tSettings = useTranslations("settings");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: name ?? "" },
  });

  async function onSubmit(values: { name?: string }) {
    setFormError(null);

    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name ?? "" }),
    });

    if (!response.ok) {
      setFormError(tSettings("toasts.error"));
      return;
    }

    const user: { name: string | null } = await response.json();
    form.reset({ name: user.name ?? "" });
    onSaved(user.name);
    toast.success(t("saved"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="settings-name">{t("nameLabel")}</Label>
            <Input
              id="settings-name"
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              {...form.register("name")}
            />
          </div>

          {formError && (
            <p role="alert" className="text-badge-rose-fg text-caption">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            loading={form.formState.isSubmitting}
            className="self-start"
          >
            {t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
