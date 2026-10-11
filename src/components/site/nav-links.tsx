"use client";

import { useRef, type FocusEvent } from "react";
import { animate } from "motion/react";
import { useTranslations } from "next-intl";

import { prefersReducedMotion } from "@/components/motion/reveal-engine";
import { isActiveRoute, navItems } from "@/content/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Desktop nav links (≥1024). Client-only because "active comes from the route"
 * (Handoff): usePathname() is the locale-free path, so it also works during static
 * rendering. The active link is green (action/secondary) on light surfaces and
 * underlined white over the Services photo, and carries aria-current="page" so the
 * state is not colour alone.
 * Hover and keyboard focus: one red underline travels between the links on a spring
 * (the same travelling accent as Services › Our approach) and fades when the pointer
 * or focus leaves. It appears in place without sliding the first time, and always
 * with reduced motion. The bar is 1 px wide and scaled to the link width.
 */
const SLIDE = motionTokens.spring.accent;
const FADE = { duration: motionTokens.duration.fast } as const;

export function NavLinks() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const barRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  const showUnder = (link: HTMLElement) => {
    const bar = barRef.current;
    if (!bar) return;
    const target = { x: link.offsetLeft, scaleX: link.offsetWidth };
    const instant = !shown.current || prefersReducedMotion();
    animate(bar, target, instant ? { duration: 0 } : SLIDE);
    animate(bar, { opacity: 1 }, FADE);
    shown.current = true;
  };

  const hideBar = () => {
    const bar = barRef.current;
    if (!bar) return;
    animate(bar, { opacity: 0 }, FADE);
    shown.current = false;
  };

  const onBlur = (event: FocusEvent<HTMLUListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) hideBar();
  };

  return (
    <ul
      className="relative flex items-center gap-xl"
      onPointerLeave={hideBar}
      onBlur={onBlur}
    >
      <span
        ref={barRef}
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-0 h-0.5 w-px origin-left rounded-full bg-action-primary opacity-0"
      />
      {navItems.map(({ key, href }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              onPointerEnter={(event) => {
                showUnder(event.currentTarget);
              }}
              onFocus={(event) => {
                showUnder(event.currentTarget);
              }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm text-nav underline-offset-4",
                "transition-colors duration-(--duration-fast) ease-standard",
                "text-text-primary hover:text-text-accent aria-[current=page]:text-action-secondary",
                "group-data-[tone=overlay]/header:text-text-on-accent",
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
