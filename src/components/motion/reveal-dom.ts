import type { AnimationPlaybackControls } from "motion/react";

import { revealSpec } from "@/lib/motion";

import {
  REVEAL_GROUP,
  REVEAL_ITEM,
  REVEAL_KINDS,
  type RevealKind,
} from "./reveal-item";

/*
 * The DOM half of the reveal engine: finding, measuring and hiding items. It never
 * imports the Motion runtime (type imports only), so components on every page can use
 * it without shipping `animate()` before the first paint. The animating half
 * (`play`, `animate`) is in reveal-engine.ts, loaded after hydration through
 * loadRevealEngine() (#105).
 */

export function kindOf(item: Element): RevealKind {
  const kind = item.getAttribute(REVEAL_ITEM);
  return REVEAL_KINDS.find((known) => known === kind) ?? "up";
}

/** The items owned by `root`: inside it, and not inside a nested group. */
export function revealItemsOf(root: Element): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(`[${REVEAL_ITEM}]`),
  ).filter((item) => item.parentElement?.closest(`[${REVEAL_GROUP}]`) === root);
}

/** Read at the moment an animation starts (effects and event handlers only). */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when the element starts below the visible viewport. */
export function isBelowFold(element: Element) {
  return element.getBoundingClientRect().top > window.innerHeight;
}

const hiddenTransform: Record<
  Exclude<RevealKind, "draw" | "underline" | "settle">,
  string
> = {
  up: `translateY(${revealSpec.distance}px)`,
  left: `translateX(${-revealSpec.slide}px)`,
  right: `translateX(${revealSpec.slide}px)`,
  pop: `scale(${revealSpec.popScale})`,
};

/**
 * Sets the start state synchronously, so an item never flashes at its final state for
 * one frame before its animation starts.
 */
export function hide(items: HTMLElement[], reduced: boolean) {
  for (const item of items) {
    const kind = kindOf(item);
    if (kind === "draw") {
      if (!reduced) item.style.strokeDashoffset = "1";
      continue;
    }
    if (kind === "underline") {
      if (!reduced) item.style.setProperty("--draw", "0");
      continue;
    }
    // Scale only: the panel around the photo does the fading.
    if (kind === "settle") {
      if (!reduced)
        item.style.transform = `scale(${String(revealSpec.settleScale)})`;
      continue;
    }
    item.style.opacity = "0";
    item.style.transform = reduced ? "" : hiddenTransform[kind];
  }
}

/** Undoes `hide`: the items show at their final state, as server-rendered. */
export function unhide(items: HTMLElement[]) {
  for (const item of items) {
    item.style.opacity = "";
    item.style.transform = "";
    item.style.strokeDashoffset = "";
    item.style.removeProperty("--draw");
  }
}

export function stopAll(controls: AnimationPlaybackControls[]) {
  for (const control of controls) control.stop();
}
