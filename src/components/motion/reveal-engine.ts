import { animate, type AnimationPlaybackControls } from "motion/react";

import { motionTokens, reducedMotionDuration, revealSpec } from "@/lib/motion";

import { hide, kindOf } from "./reveal-dom";

// The DOM helpers live in reveal-dom.ts; re-exported for the components
// which load this module up front. animate() is exported for loadRevealEngine().
export {
  hide,
  isBelowFold,
  prefersReducedMotion,
  revealItemsOf,
  stopAll,
  unhide,
} from "./reveal-dom";
export { animate };

/*
 * The reveal engine shared by every animated section. Markup stays server-rendered
 * and opts in with `{...revealItem("pop")}` (reveal-item.ts); a client component
 * (RevealGroup, ProcessTrack, ApproachTabs) decides *when* its items
 * play, and this module decides *how*.
 *
 * Reduced motion: opacity only, 150 ms, all at once; strokes are simply drawn.
 *
 * This module imports the Motion runtime. Components on every page load it after
 * hydration with loadRevealEngine() and use reveal-dom.ts until then (#105).
 */

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
      if (kind === "settle")
        return animate(item, { scale: 1 }, { duration: 0 });
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
      case "settle":
        return animate(
          item,
          { scale: [revealSpec.settleScale, 1] },
          { ...reveal, duration: revealSpec.settleDuration },
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
