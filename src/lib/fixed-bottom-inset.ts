"use client";

import { useEffect, type RefObject } from "react";

/*
 * Keeps keyboard focus clear of the layers fixed to the bottom of the screen (WCAG 2.4.11
 * Focus Not Obscured, #177). `html` reserves `--fixed-bottom-inset` as scroll padding
 * (globals.css), so when focus or an anchor scrolls the page, the browser stops the
 * target above whatever bottom layer is showing. Safari otherwise scrolls a focused
 * control only just into view, under the bar.
 *
 * Each layer (Sticky CTA, promo card, cookie banner) registers its height plus its
 * distance from the bottom while it's shown; the variable is the tallest one. The
 * measure ignores transforms (offsetHeight and the computed `bottom`), so an entrance
 * animation in progress doesn't change it. A layer that appears over a keyboard-focused
 * control scrolls that control back into view (revealCoveredFocus).
 */

const insets = new Map<string, number>();

function apply() {
  const tallest = Math.max(0, ...insets.values());
  document.documentElement.style.setProperty(
    "--fixed-bottom-inset",
    `${String(Math.ceil(tallest))}px`,
  );
}

export function setFixedBottomInset(id: string, px: number) {
  if (px > 0) insets.set(id, px);
  else insets.delete(id);
  apply();
}

/** Space the element takes at the bottom of the viewport, or 0 if it isn't rendered. */
export function bottomInsetOf(element: HTMLElement): number {
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return 0;
  const height = element.offsetHeight;
  if (height === 0) return 0;
  return height + (Number.parseFloat(style.bottom) || 0);
}

/**
 * A layer can appear after focus has already scrolled the page: tabbing past the hero
 * brings in the Sticky CTA, over the control that just took focus. If a keyboard-focused
 * control now sits under the new layer, scroll it back into view; the scroll respects the
 * padding the layer just reserved. Mouse and touch focus (no :focus-visible) never move.
 */
function revealCoveredFocus(inset: number) {
  const focused = document.activeElement;
  if (inset === 0 || !(focused instanceof HTMLElement)) return;
  if (focused === document.body || !focused.matches(":focus-visible")) return;
  if (focused.getBoundingClientRect().bottom > window.innerHeight - inset) {
    focused.scrollIntoView({ block: "nearest" });
  }
}

/**
 * Registers `ref`'s element as a bottom layer while `active`. It re-measures when the
 * element resizes and when the viewport changes (the breakpoints move or hide it).
 */
export function useFixedBottomInset(
  id: string,
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const element = ref.current;
    if (!active || !element) {
      setFixedBottomInset(id, 0);
      return;
    }
    const measure = () => {
      setFixedBottomInset(id, bottomInsetOf(element));
    };
    measure();
    revealCoveredFocus(bottomInsetOf(element));
    // Every supported browser has ResizeObserver; jsdom (unit tests) doesn't.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      setFixedBottomInset(id, 0);
    };
  }, [id, ref, active]);
}
