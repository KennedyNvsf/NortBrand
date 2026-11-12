import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { serviceSlugs } from "@/content/services";

import {
  DRAW_KINDS,
  DRAW_TOTAL,
  PENCIL_RIDE,
  type DrawKind,
} from "./illustration-parts";
import { serviceIllustrations } from "./service-illustrations";

/*
 * The drawings follow the Figma timelines (Motion Spec › Service illustrations): every
 * marked part has a known kind and finishes inside "Draw 0–1.9s"; strokes can trim on.
 */

/** Float sums like 0.8 + 1.1 land a hair above 1.9. */
const END = DRAW_TOTAL + 1e-9;

type Part = { kind: string; at: number; duration: number; tag: string };

function partsOf(markup: string): Part[] {
  return Array.from(markup.matchAll(/<(\w+)[^>]*data-draw="(\w+)"[^>]*>/g)).map(
    ([element = "", tag = "", kind = ""]) => ({
      tag,
      kind,
      at: Number(/data-draw-at="([\d.]+)"/.exec(element)?.[1] ?? NaN),
      duration: Number(/data-draw-for="([\d.]+)"/.exec(element)?.[1] ?? 0),
    }),
  );
}

describe("service illustrations", () => {
  it.each(serviceSlugs)("%s draws within the spec", (slug) => {
    const Illustration = serviceIllustrations[slug];
    const markup = renderToStaticMarkup(<Illustration />);
    const parts = partsOf(markup);

    expect(parts.length).toBeGreaterThan(1);
    expect(markup).toContain('aria-hidden="true"');
    for (const part of parts) {
      expect(DRAW_KINDS).toContain(part.kind as DrawKind);
      expect(part.at).toBeGreaterThanOrEqual(0);
      expect(part.at + part.duration).toBeLessThanOrEqual(END);
      if (part.kind === "trace" || part.kind === "pop")
        expect(part.duration).toBeGreaterThan(0);
    }
    // Every trimmed stroke measures its length as 1, so the dash maths hold.
    const traces = markup.match(/<path[^>]*data-draw="trace"[^>]*>/g) ?? [];
    for (const trace of traces) expect(trace).toContain('pathLength="1"');
  });

  it("the pencil rides the whole line and comes to rest", () => {
    expect(PENCIL_RIDE.x).toHaveLength(PENCIL_RIDE.y.length);
    expect(PENCIL_RIDE.x.at(-1)).toBe(0);
    expect(PENCIL_RIDE.y.at(-1)).toBe(0);
    expect(PENCIL_RIDE.at + PENCIL_RIDE.duration).toBeLessThanOrEqual(END);
  });
});
