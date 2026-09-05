"use client";

import { BookOpen, LayoutDashboard, LifeBuoy, Settings, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/docs", labelKey: "docs", icon: BookOpen },
] as const;

const adminNavItem = { href: "/admin", labelKey: "admin", icon: ShieldCheck } as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// `isAdmin` is threaded down from each layout's own `getSession()` call (both (app) and
// (admin) already fetch the session for their own guard) — without this, an admin has no way
// to reach `/admin` from the UI short of typing the URL, since the route intentionally isn't
// linked from anywhere else (task 8.2).
export function RailNav({
  onNavigate,
  isAdmin = false,
}: {
  onNavigate?: () => void;
  isAdmin?: boolean;
}) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const navItems = isAdmin ? [...primaryNav, adminNavItem] : primaryNav;

  return (
    <div className="flex h-full flex-col gap-8 p-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-control px-2 py-1.5"
      >
        <span className="bg-accent text-surface flex size-7 shrink-0 items-center justify-center rounded-control text-sm font-semibold">
          {brand.shortName.charAt(0)}
        </span>
        <span className="text-surface text-body font-medium">{brand.shortName}</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-surface/70 flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors",
                "hover:bg-surface/10 hover:text-surface",
                active && "bg-surface/10 text-surface",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        <a
          href={`mailto:${brand.email}`}
          className="text-surface/70 hover:bg-surface/10 hover:text-surface flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors"
        >
          <LifeBuoy className="size-4" aria-hidden="true" />
          {t("support")}
        </a>
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          aria-current={isActive(pathname, "/dashboard/settings") ? "page" : undefined}
          className={cn(
            "text-surface/70 flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors",
            "hover:bg-surface/10 hover:text-surface",
            isActive(pathname, "/dashboard/settings") && "bg-surface/10 text-surface",
          )}
        >
          <Settings className="size-4" aria-hidden="true" />
          {t("settings")}
        </Link>
      </div>
    </div>
  );
}
