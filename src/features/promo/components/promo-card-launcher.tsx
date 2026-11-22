"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { promo, type PromoPlacement } from "@/content/promo";
import { trackEvent } from "@/lib/analytics";

import { dismissPromo } from "../promo-storage";
import { usePromoTrigger } from "../use-promo-trigger";
import type { PromoCopy } from "./promo-copy";

/*
 * When the corner card shows on About and Services (#127). The same rules as the Home
 * modal (use-promo-trigger.ts): 8 s after the cookie choice, once per visitor, never
 * after the end date, never over an open dialog. The dismissal is shared: closing the
 * card or the modal hides both, everywhere.
 * - Renders nothing until due, so the static page carries no markup for it. The card
 *   is its own small chunk, loaded when it's due.
 * - While the card is on screen, <body data-promo-card> lets the mobile Sticky CTA
 *   step aside (globals.css); it's removed once the card has finished leaving, so the
 *   bar comes back after the card, not on top of it.
 * - Close and "Book a Consultation" both remember the dismissal: the visitor has seen
 *   the offer and acted on it.
 */
const PromoCard = dynamic(() =>
  import("./promo-card").then((module) => module.PromoCard),
);

/** After the card is due: still up, leaving (exit animation), or gone. */
type Exit = "none" | "closing" | "gone";

export function PromoCardLauncher({
  copy,
  placement,
}: {
  copy: Pick<PromoCopy, "label" | "title" | "terms" | "book" | "close">;
  placement: Exclude<PromoPlacement, "home">;
}) {
  const due = usePromoTrigger(promo);
  const [exit, setExit] = useState<Exit>("none");
  const phase = !due ? "hidden" : exit === "none" ? "open" : exit;

  useEffect(() => {
    if (due) trackEvent("promo_view", { placement });
  }, [due, placement]);

  const onScreen = phase === "open" || phase === "closing";
  useEffect(() => {
    if (!onScreen) return;
    document.body.setAttribute("data-promo-card", "");
    return () => {
      document.body.removeAttribute("data-promo-card");
    };
  }, [onScreen]);

  // The exit animation's end unmounts the card; this is the fallback for a browser that
  // runs no animation at all (so no animationend ever fires).
  useEffect(() => {
    if (exit !== "closing") return;
    const timer = window.setTimeout(() => {
      setExit("gone");
    }, 400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [exit]);

  const close = (event: "promo_dismiss" | "promo_click") => {
    if (phase !== "open") return;
    trackEvent(event, { placement });
    dismissPromo(promo.id);
    setExit("closing");
  };

  if (!onScreen) return null;

  return (
    <PromoCard
      copy={copy}
      closing={phase === "closing"}
      onClose={() => {
        close("promo_dismiss");
      }}
      onBook={() => {
        close("promo_click");
      }}
      onExited={() => {
        setExit("gone");
      }}
    />
  );
}
