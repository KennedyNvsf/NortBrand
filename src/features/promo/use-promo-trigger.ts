"use client";

import { useEffect, useState } from "react";

import { isPromoActive, type Promo } from "@/content/promo";
import { useConsent } from "@/features/consent/consent-store";

import { isPromoDismissed } from "./promo-storage";

/*
 * When the promo may appear (#126, lead's decisions of 2026-11-12):
 * - only after the cookie choice, so it never lands on top of the banner;
 * - `delayMs` (8 s) after that, once per visitor: a dismissed offer stays dismissed;
 * - never after the offer's end date, checked in the browser at view time;
 * - never over another dialog: if the menu, cookie settings or a service's details
 *   are open when the delay ends (Radix marks <body data-scroll-locked>), it waits
 *   for them to close.
 *
 * Returns true once, when the promo should open. Closing it is the caller's job.
 */
export function usePromoTrigger(offer: Promo): boolean {
  const decided = useConsent().status === "decided";
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!decided) return;
    if (!isPromoActive(new Date(), offer) || isPromoDismissed(offer.id)) return;

    let observer: MutationObserver | undefined;
    const body = document.body;
    const isLocked = () => body.hasAttribute("data-scroll-locked");

    const timer = window.setTimeout(() => {
      if (!isLocked()) {
        setDue(true);
        return;
      }
      observer = new MutationObserver(() => {
        if (isLocked()) return;
        observer?.disconnect();
        setDue(true);
      });
      observer.observe(body, {
        attributes: true,
        attributeFilter: ["data-scroll-locked"],
      });
    }, offer.delayMs);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [decided, offer]);

  return due;
}
