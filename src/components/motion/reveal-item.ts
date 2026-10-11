/*
 * Reveal markers: plain data attributes, safe to use in Server Components (this module
 * must not import the Motion library). The engine in reveal-engine.ts reads them.
 *
 *   up     rise 32 px and fade (text, cards)
 *   left   slide in from the left (an image panel on the left)
 *   right  slide in from the right (an image panel on the right, tab content)
 *   pop    scale 0.88 → 1 on a spring with a small overshoot (images, cards)
 *   draw   an SVG stroke draws itself; the path needs pathLength={1}
 */

import type { CSSProperties } from "react";

export const REVEAL_KINDS = ["up", "left", "right", "pop", "draw"] as const;
export type RevealKind = (typeof REVEAL_KINDS)[number];

export const REVEAL_ITEM = "data-reveal-item";
export const REVEAL_GROUP = "data-reveal-group";

/** Spread onto an element to make it a reveal item. */
export function revealItem(kind: RevealKind = "up") {
  return { [REVEAL_ITEM]: kind } as const;
}

type EnterStyle = CSSProperties & { "--enter-index": number };

/**
 * Hero entrance marker (CSS only, globals.css `[data-enter]`): plays on first paint,
 * `index` 0, 1, 2… sets the order, 110 ms apart.
 */
export function enterItem(index: number) {
  const style: EnterStyle = { "--enter-index": index };
  return { "data-enter": "", style };
}
