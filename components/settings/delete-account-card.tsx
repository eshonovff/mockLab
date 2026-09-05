"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";

export function DeleteAccountCard({ email }: { email: string }) {
  const t = useTranslations("settings.deleteAccount");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);

    const response = await fetch("/api/auth/me", { method: "DELETE" });

    if (!response.ok) {
      setLoading(false);
      toast.error(tSettings("toasts.error"));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-body text-ink-muted">{t("description")}</p>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button variant="destructive" className="self-start">
              {t("trigger")}
            </Button>
          }
          title={t("confirmTitle")}
          description={t("confirmDescription", { email })}
          confirmText={t("confirmButton")}
          confirmWord={email}
          loading={loading}
          onConfirm={handleConfirm}
        />
      </CardContent>
    </Card>
  );
}
