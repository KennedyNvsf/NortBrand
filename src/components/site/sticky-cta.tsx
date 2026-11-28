"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { BookingButton } from "@/components/site/booking-button";
import { useConsent } from "@/features/consent/consent-store";
import { useFixedBottomInset } from "@/lib/fixed-bottom-inset";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Sticky CTA (357:150). "Mobile only (390). Floats 12px above
 * the safe area." Handoff: "Shows after the hero leaves view; hides over the CTA band,
 * menu, modal and cookie banner." CLAUDE.md: mounted on the blog listing only.
 * - Visibility comes from IntersectionObserver, not scroll events: the page marks its
 *   hero with data-sticky-cta-trigger and anything that should hide the bar with
 *   data-sticky-cta-hide (the CtaBand does this itself).
 * - Hidden while a Radix dialog, sheet or menu is open (globals.css, data-scroll-locked).
 * - While hidden it is `inert`, so it can't take focus or be read out.
 * - Waits for a cookie choice (Handoff, ADR-007): hidden while the consent state is
 *   unknown or the banner is up, so the two never stack at the bottom of the screen.
 * - A page must mark its hero with data-sticky-cta-trigger, or the bar never shows.
 */

function useStickyCtaVisible(): boolean {
  const [heroVisible, setHeroVisible] = useState(true);
  const [blockersVisible, setBlockersVisible] = useState(0);

  useEffect(() => {
    const hero = document.querySelector("[data-sticky-cta-trigger]");
    const blockers = document.querySelectorAll("[data-sticky-cta-hide]");
    const onScreen = new Set<Element>();

    const heroObserver = new IntersectionObserver(([entry]) => {
      setHeroVisible(entry?.isIntersecting ?? false);
    });
    const blockerObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setBlockersVisible(onScreen.size);
    });

    // No hero marker means no trigger: the bar stays hidden (safe default).
    if (hero) heroObserver.observe(hero);
    blockers.forEach((blocker) => {
      blockerObserver.observe(blocker);
    });

    return () => {
      heroObserver.disconnect();
      blockerObserver.disconnect();
    };
  }, []);

  return !heroVisible && blockersVisible === 0;
}

export function StickyCta() {
  const t = useTranslations("StickyCta");
  const decided = useConsent().status === "decided";
  const visible = useStickyCtaVisible() && decided;
  const ref = useRef<HTMLElement>(null);
  // Focus and anchors stop above the bar while it shows (#177).
  useFixedBottomInset("sticky-cta", ref, visible);

  return (
    <aside
      ref={ref}
      data-slot="sticky-cta"
      data-visible={visible || undefined}
      aria-label={t("label")}
      inert={!visible}
      className={cn(
        "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 md:hidden",
        "flex h-18 items-center justify-between gap-sm rounded-lg border border-border-default bg-bg-surface py-3 pr-3 pl-4.5 shadow-overlay",
        "transition-[opacity,translate] duration-(--duration-base) ease-standard",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none opacity-0 motion-safe:translate-y-4",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body font-semibold text-text-primary">
          {t("title")}
        </p>
        <p className="truncate text-caption text-text-muted">{t("meta")}</p>
      </div>
      <BookingButton className="shrink-0">{t("action")}</BookingButton>
    </aside>
  );
}
