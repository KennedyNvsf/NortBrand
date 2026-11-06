"use client";

import type { RefObject } from "react";
import { ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { BookingButton } from "@/components/site/booking-button";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { isActiveRoute, navItems } from "@/content/navigation";
import { site } from "@/content/site";
import { Link, usePathname } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { roundButton } from "./mobile-menu";

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
 * - Loaded on demand by MobileMenu (#105), which owns the button. With no Radix
 *   trigger, closing returns focus to that button explicitly.
 */

const LINK_STAGGER_MS = 40;

export function MobileMenuPanel({
  id,
  open,
  setOpen,
  triggerRef,
}: {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const pathname = usePathname();
  const email = site.contact.email.value;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        id={id}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        side="top"
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 overflow-y-auto border-0 p-0 shadow-none data-[side=top]:h-dvh data-[side=top]:border-b-0"
      >
        <div className="flex min-h-full flex-col px-(--gutter) pt-3.5 pb-7 md:pt-4">
          <div className="flex items-center justify-between">
            <SheetClose asChild>
              <Link
                href="/"
                className="touch-target rounded-sm text-text-primary"
              >
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
              <BookingButton className="w-full">
                {common("bookConsultation")}
              </BookingButton>
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
