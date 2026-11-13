"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { isPromoActive, promo, type PromoPlacement } from "@/content/promo";
import { trackEvent } from "@/lib/analytics";

import { dismissPromo, isPromoDismissed } from "../promo-storage";
import { usePromoTrigger } from "../use-promo-trigger";
import type { PromoCopy } from "./promo-copy";

/*
 * Decides when the Home promo opens and records what the visitor does with it (#126).
 * Renders nothing until the trigger fires (use-promo-trigger.ts), so it adds no
 * markup to the static page and no layout shift.
 * - The dialog (Radix Dialog or vaul, about 20 KiB) is its own chunk (#105,
 *   docs/guides/performance.md): prefetched when the browser is idle, and only for a
 *   visitor who can still see the offer, then mounted when it opens. It stays mounted
 *   after closing so its exit animation can play.
 * - Every way of closing remembers the dismissal, including "Book a Consultation":
 *   the visitor has acted on the offer, so it should not come back.
 */
const loadDialog = () => import("./promo-dialog").then((m) => m.PromoDialog);
const PromoDialog = dynamic(loadDialog);

function prefetchWhenIdle(): () => void {
  const prefetch = () => {
    void loadDialog();
  };
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(prefetch, { timeout: 5000 });
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const handle = setTimeout(prefetch, 3000);
  return () => {
    clearTimeout(handle);
  };
}

export function PromoLauncher({
  copy,
  placement,
}: {
  copy: PromoCopy;
  placement: PromoPlacement;
}) {
  const due = usePromoTrigger(promo);
  const [closed, setClosed] = useState(false);
  const open = due && !closed;

  useEffect(() => {
    if (isPromoDismissed(promo.id) || !isPromoActive(new Date())) return;
    return prefetchWhenIdle();
  }, []);

  useEffect(() => {
    if (due) trackEvent("promo_view", { placement });
  }, [due, placement]);

  const close = () => {
    dismissPromo(promo.id);
    setClosed(true);
  };

  if (!due) return null;

  return (
    <PromoDialog
      copy={copy}
      open={open}
      onOpenChange={(next) => {
        if (next || !open) return;
        // Esc, the backdrop, Close, "Not now" or a swipe down.
        trackEvent("promo_dismiss", { placement });
        close();
      }}
      onBook={() => {
        trackEvent("promo_click", { placement });
        close();
      }}
    />
  );
}
