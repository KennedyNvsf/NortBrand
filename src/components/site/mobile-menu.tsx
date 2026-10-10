"use client";

import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BOOKING_HREF, isActiveRoute, navItems } from "@/content/navigation";
import { site } from "@/content/site";
import { Link, usePathname } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Tablet and mobile menu (Figma 343:92, 343:126). Handoff: "shadcn Sheet, full screen,
 * focus trap, scroll lock" — Radix Dialog provides the trap, scroll lock, Esc to close
 * and focus return to the menu button.
 * - Every link closes the sheet (SheetClose asChild), so the next page never opens
 *   under a stale menu.
 * - Opening and closing use the tw-animate fade + slide. The links then rise 12 px in
 *   sequence, 40 ms apart, 250 ms standard (Motion Spec › Mobile › Menu overlay), as a
 *   CSS animation with a per-link delay. Reduced motion: motion-safe only, so the
 *   links simply appear with the sheet.
 */

const LINK_STAGGER_MS = 40;

const roundButton =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-default bg-bg-surface text-icon-default transition-colors duration-(--duration-fast) ease-standard hover:border-border-strong";

export function MobileMenu() {
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const email = site.contact.email.value;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={roundButton} aria-label={t("openMenu")}>
        <Menu className="size-6" strokeWidth={ICON_STROKE} aria-hidden />
      </SheetTrigger>
      <SheetContent
        side="top"
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-y-auto border-0 p-0 shadow-none data-[side=top]:h-dvh data-[side=top]:border-b-0"
      >
        <div className="flex min-h-full flex-col px-(--gutter) pt-3.5 pb-7 md:pt-4">
          <div className="flex items-center justify-between">
            <SheetClose asChild>
              <Link href="/" className="rounded-sm text-text-primary">
                <Logo label={t("home")} />
              </Link>
            </SheetClose>
            <SheetClose className={roundButton} aria-label={t("closeMenu")}>
              <X className="size-6" strokeWidth={ICON_STROKE} aria-hidden />
            </SheetClose>
          </div>
          <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>

          <nav aria-label={t("label")} className="pt-7">
            <ul className="border-t border-border-default">
              {navItems.map(({ key, href }, index) => {
                const active = isActiveRoute(pathname, href);
                return (
                  <li
                    key={key}
                    style={{ animationDelay: `${index * LINK_STAGGER_MS}ms` }}
                    className="border-b border-border-default motion-safe:animate-in motion-safe:duration-(--duration-base) motion-safe:ease-standard motion-safe:fade-in-0 motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-3"
                  >
                    <SheetClose asChild>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-md rounded-sm py-5.5 text-h1",
                          "text-text-primary aria-[current=page]:text-action-secondary",
                        )}
                      >
                        {t(key)}
                        <ArrowRight
                          className="size-6 shrink-0"
                          strokeWidth={ICON_STROKE}
                          aria-hidden
                        />
                      </Link>
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col items-center gap-3.5 pt-xl">
            <LocaleSwitcher
              onNavigate={() => {
                setOpen(false);
              }}
            />
            <SheetClose asChild>
              <Button asChild showIcon className="w-full">
                <Link href={BOOKING_HREF}>{common("bookConsultation")}</Link>
              </Button>
            </SheetClose>
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-11 items-center rounded-sm text-body text-text-muted hover:text-text-accent"
            >
              {email}
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
