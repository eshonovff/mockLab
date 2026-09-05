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
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validators";

export function PasswordForm() {
  const t = useTranslations("settings.password");
  const tSettings = useTranslations("settings");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null);

    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      form.reset({ currentPassword: "", newPassword: "" });
      toast.success(t("saved"));
      return;
    }

    if (response.status === 400) {
      const body: { errors?: Record<string, string[]> } = await response.json().catch(() => ({}));
      if (body.errors?.currentPassword) {
        form.setError("currentPassword", { message: t("errors.currentIncorrect") });
        return;
      }
    }

    setFormError(tSettings("toasts.error"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-current-password">{t("currentLabel")}</Label>
            <Input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.currentPassword?.message}
              {...form.register("currentPassword")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-new-password">{t("newLabel")}</Label>
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              error={form.formState.errors.newPassword ? t("errors.newMin") : undefined}
              {...form.register("newPassword")}
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
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
