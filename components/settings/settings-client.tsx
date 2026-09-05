"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { LanguageSection } from "@/components/settings/language-section";
import { PasswordForm } from "@/components/settings/password-form";
import { ProfileForm } from "@/components/settings/profile-form";

export function SettingsClient({
  initialName,
  email,
}: {
  initialName: string | null;
  email: string;
}) {
  const t = useTranslations("settings");
  const [name, setName] = useState(initialName);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-display text-ink">{t("title")}</h1>
      <ProfileForm name={name} onSaved={setName} />
      <LanguageSection />
      <PasswordForm />
      <DeleteAccountCard email={email} />
    </div>
  );
}
