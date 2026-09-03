"use client";

import { Bell, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { RailNav } from "@/components/shell/rail-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

export function TopBar() {
  const t = useTranslations("shell");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="border-line flex h-16 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
            <Menu className="size-4" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-rail w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
          <RailNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative max-w-sm flex-1">
        <Search
          className="text-ink-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input type="search" placeholder={t("search")} className="pl-8" aria-label={t("search")} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={t("notifications")}>
          <Bell className="size-4" aria-hidden="true" />
        </Button>

        <LocaleSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("account")} className="rounded-full">
              <Avatar size="sm">
                <AvatarFallback>
                  <UserRound className="size-3.5" aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="size-4" aria-hidden="true" />
                {t("settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled>
              <LogOut className="size-4" aria-hidden="true" />
              {t("logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
