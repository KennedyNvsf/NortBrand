/*
 * How a service illustration draws itself (Motion Spec › Service illustrations, Figma
 * timelines 494:476 Web Design, 494:547 Web Development, 494:595 Content Writing,
 * 494:652 Social Media Management, 494:715 Website Maintenance). Plain data, safe in
 * Server Components: the SVGs mark their parts with `drawPart()`, and the client
 * IllustrationPlayer reads the marks and plays them.
 *
 *   trace   a stroke trims on from its start (the path needs pathLength={1})
 *   pop     a solid shape appears and grows from 60% to full size
 *   appear  shows at once (white underlays, the pencil before it starts writing)
 *   ride    the pencil follows the line it writes, point for point (PENCIL_RIDE)
 *
 * Times are seconds from the moment the card scrolls into view, read off the Figma
 * timelines (a 4.6 s demo loop; the drawing occupies 0–1.9 s). Strokes and pops use
 * the emphasized curve; the cursive line and the pencil riding it are linear, so the
 * pencil stays on the line.
 */

export const DRAW_KINDS = ["trace", "pop", "appear", "ride"] as const;
export type DrawKind = (typeof DRAW_KINDS)[number];

export const DRAW_ATTR = "data-draw";
export const DRAW_AT_ATTR = "data-draw-at";
export const DRAW_FOR_ATTR = "data-draw-for";
export const DRAW_EASE_ATTR = "data-draw-ease";

/** A "pop" starts at this scale (Figma: 0.6 → 1). */
export const POP_FROM_SCALE = 0.6;

/** The drawing never runs past this (Motion Spec: "Draw 0–1.9s"). */
export const DRAW_TOTAL = 1.9;

/**
 * The pencil's offset from its resting place while it writes (Figma 494:603, user
 * units): it starts 110 left and 12 down at the start of the line, and arrives at rest
 * as the line ends.
 */
export const PENCIL_RIDE = {
  at: 0.8,
  duration: 1.1,
  x: [
    -110, -97.7, -86.7, -99.3, -93.3, -75.9, -60.9, -66.5, -64.3, -47.1, -32.9,
    -16.9, 0,
  ],
  y: [12, -1.2, 9.5, 15.2, -0.8, -5.7, 3.8, 15.8, 1, -3.2, 8.1, 5.4, 0],
} as const;

type DrawPartOptions = {
  /** Seconds; omit for `appear`, which is instant. */
  duration?: number;
  /** Linear instead of emphasized (the cursive line the pencil rides). */
  linear?: boolean;
};

/** Spread onto an SVG element to make it a part of the drawing. */
export function drawPart(
  kind: DrawKind,
  at: number,
  { duration, linear = false }: DrawPartOptions = {},
) {
  return {
    [DRAW_ATTR]: kind,
    [DRAW_AT_ATTR]: at,
    ...(duration === undefined ? {} : { [DRAW_FOR_ATTR]: duration }),
    ...(linear ? { [DRAW_EASE_ATTR]: "linear" } : {}),
  };
}

export type DrawPart = {
  element: SVGElement;
  kind: DrawKind;
  at: number;
  duration: number;
  linear: boolean;
};

/** Reads the marked parts inside `root`, in document order. */
export function drawPartsOf(root: Element): DrawPart[] {
  return Array.from(root.querySelectorAll<SVGElement>(`[${DRAW_ATTR}]`)).map(
    (element) => {
      const kind =
        DRAW_KINDS.find((known) => known === element.getAttribute(DRAW_ATTR)) ??
        "appear";
      return {
        element,
        kind,
        at: Number(element.getAttribute(DRAW_AT_ATTR) ?? 0),
        duration: Number(element.getAttribute(DRAW_FOR_ATTR) ?? 0),
        linear: element.getAttribute(DRAW_EASE_ATTR) === "linear",
      };
    },
  );
}
