"use client";

import { useTranslations } from "next-intl";

import { isActiveRoute, navItems } from "@/content/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * Desktop nav links (≥1024). Client-only because "active comes from the route"
 * (Handoff): usePathname() is the locale-free path, so it also works during static
 * rendering. The active link is green (action/secondary) on light surfaces and
 * underlined white over the Services photo, and carries aria-current="page" so the
 * state is not colour alone.
 */
export function NavLinks() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-xl">
      {navItems.map(({ key, href }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm text-nav underline-offset-4",
                "transition-colors duration-(--duration-fast) ease-standard",
                "text-text-primary hover:text-text-accent aria-[current=page]:text-action-secondary",
                "group-data-[tone=overlay]/header:text-text-on-accent group-data-[tone=overlay]/header:hover:underline",
                "group-data-[tone=overlay]/header:aria-[current=page]:text-text-on-accent group-data-[tone=overlay]/header:aria-[current=page]:underline",
              )}
            >
              {t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
