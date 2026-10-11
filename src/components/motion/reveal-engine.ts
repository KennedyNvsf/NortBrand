import { animate, type AnimationPlaybackControls } from "motion/react";

import { motionTokens, reducedMotionDuration, revealSpec } from "@/lib/motion";

import {
  REVEAL_GROUP,
  REVEAL_ITEM,
  REVEAL_KINDS,
  type RevealKind,
} from "./reveal-item";

/*
 * The reveal engine shared by every animated section. Markup stays server-rendered
 * and opts in with `{...revealItem("pop")}` (reveal-item.ts); a client component
 * (RevealGroup, ServiceStage, ProcessTrack, ApproachTabs) decides *when* its items
 * play, and this module decides *how*.
 *
 * `hide` sets the start state synchronously, so an item never flashes at its final
 * state for one frame before its animation starts. Reduced motion: opacity only,
 * 150 ms, all at once; strokes are simply drawn.
 */

function kindOf(item: Element): RevealKind {
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
  Exclude<RevealKind, "draw" | "underline">,
  string
> = {
  up: `translateY(${revealSpec.distance}px)`,
  left: `translateX(${-revealSpec.slide}px)`,
  right: `translateX(${revealSpec.slide}px)`,
  pop: `scale(${revealSpec.popScale})`,
};

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
    item.style.opacity = "0";
    item.style.transform = reduced ? "" : hiddenTransform[kind];
  }
}

type PlayOptions = {
  reduced: boolean;
  /** Seconds before the first item. */
  delay?: number;
  /** Seconds between items; defaults to the reveal stagger. */
  stagger?: number;
  /** Per-item delays, overriding delay/stagger (ProcessTrack follows its line). */
  delays?: number[];
};

/** Hide, then play each item in order. Returns controls to stop them all. */
export function play(
  items: HTMLElement[],
  { reduced, delay = 0, stagger = revealSpec.stagger, delays }: PlayOptions,
): AnimationPlaybackControls[] {
  hide(items, reduced);

  return items.map((item, index) => {
    const at = delays?.[index] ?? delay + index * stagger;
    const kind = kindOf(item);

    if (reduced) {
      if (kind === "draw")
        return animate(item, { strokeDashoffset: 0 }, { duration: 0 });
      if (kind === "underline")
        return animate(item, { "--draw": 1 }, { duration: 0 });
      return animate(
        item,
        { opacity: [0, 1] },
        { duration: reducedMotionDuration, delay: delays ? 0 : delay },
      );
    }

    const reveal = {
      duration: motionTokens.duration.reveal,
      ease: motionTokens.ease.emphasized,
      delay: at,
    };

    switch (kind) {
      case "draw":
        return animate(
          item,
          { strokeDashoffset: [1, 0] },
          {
            ...reveal,
            duration: revealSpec.drawDuration,
            ease: motionTokens.ease.draw,
          },
        );
      case "underline":
        // Starts once its headline has mostly landed.
        return animate(
          item,
          { "--draw": [0, 1] },
          {
            duration: motionTokens.duration.reveal,
            ease: motionTokens.ease.draw,
            delay: at + revealSpec.underlineLag,
          },
        );
      case "pop":
        return animate(
          item,
          { opacity: [0, 1], scale: [revealSpec.popScale, 1] },
          {
            opacity: { ...reveal, duration: motionTokens.duration.slow },
            scale: { ...motionTokens.spring.pop, delay: at },
          },
        );
      case "left":
      case "right":
        return animate(
          item,
          {
            opacity: [0, 1],
            x: [kind === "left" ? -revealSpec.slide : revealSpec.slide, 0],
          },
          reveal,
        );
      case "up":
        return animate(
          item,
          { opacity: [0, 1], y: [revealSpec.distance, 0] },
          reveal,
        );
    }
  });
}

export function stopAll(controls: AnimationPlaybackControls[]) {
  for (const control of controls) control.stop();
}
