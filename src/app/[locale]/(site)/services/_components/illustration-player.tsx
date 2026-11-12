"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { AnimationPlaybackControls } from "motion/react";

import { loadRevealEngine } from "@/components/motion/load-reveal-engine";
import {
  isBelowFold,
  prefersReducedMotion,
  REVEAL_ROOT_MARGIN,
  stopAll,
} from "@/components/motion/reveal-dom";
import { motionTokens } from "@/lib/motion";

import {
  drawPartsOf,
  PENCIL_RIDE,
  POP_FROM_SCALE,
  type DrawPart,
} from "./illustration-parts";

/*
 * Plays a service illustration's drawing once, as its card scrolls into view (Motion
 * Spec › Service cards: "no entrance of their own: the drawing is the reveal"). The
 * SVG stays server-rendered; this wrapper is the card's media panel.
 * - Same rules as RevealGroup: only a drawing still below the fold after mount is
 *   hidden, so above the fold, before hydration and without JavaScript it simply
 *   shows. Same trigger point (REVEAL_ROOT_MARGIN).
 * - Reduced motion: nothing is hidden or drawn (Motion Spec › Reduced motion:
 *   "drawings show their final state").
 * - Motion's animate() comes from the lazily loaded reveal engine (#105). If it fails
 *   to load, the hidden parts are shown again.
 */

type Animate = Awaited<ReturnType<typeof loadRevealEngine>>["animate"];

const noop = () => undefined;

function hideParts(parts: DrawPart[]) {
  for (const { element, kind } of parts) {
    element.style.opacity = "0";
    if (kind === "trace") element.style.strokeDashoffset = "1";
    if (kind === "pop")
      element.style.transform = `scale(${String(POP_FROM_SCALE)})`;
    if (kind === "ride")
      element.style.transform = `translate(${String(PENCIL_RIDE.x[0])}px, ${String(PENCIL_RIDE.y[0])}px)`;
  }
}

/** Undoes hideParts: the drawing shows complete, as server-rendered. */
function showParts(parts: DrawPart[]) {
  for (const { element } of parts) {
    element.style.opacity = "";
    element.style.strokeDashoffset = "";
    element.style.transform = "";
  }
}

function drawParts(
  parts: DrawPart[],
  animate: Animate,
): AnimationPlaybackControls[] {
  const { emphasized } = motionTokens.ease;
  const appear = (at: number) => ({ duration: 0, delay: at });

  return parts.flatMap(({ element, kind, at, duration, linear }) => {
    const ease = linear ? "linear" : emphasized;
    switch (kind) {
      case "trace":
        return [
          animate(
            element,
            { opacity: 1, strokeDashoffset: [1, 0] },
            { duration, delay: at, ease, opacity: appear(at) },
          ),
        ];
      case "pop":
        return [
          animate(
            element,
            { opacity: 1, scale: [POP_FROM_SCALE, 1] },
            { duration, delay: at, ease, opacity: appear(at) },
          ),
        ];
      case "appear":
        return [animate(element, { opacity: 1 }, appear(at))];
      case "ride":
        return [
          animate(element, { opacity: 1 }, appear(at)),
          animate(
            element,
            { x: [...PENCIL_RIDE.x], y: [...PENCIL_RIDE.y] },
            {
              duration: PENCIL_RIDE.duration,
              delay: PENCIL_RIDE.at,
              ease: "linear",
            },
          ),
        ];
    }
  });
}

export function IllustrationPlayer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !isBelowFold(root) || prefersReducedMotion()) return;

    const parts = drawPartsOf(root);
    hideParts(parts);

    let active = true;
    const controls: AnimationPlaybackControls[] = [];
    const engine = loadRevealEngine();
    engine.catch(() => {
      if (active) showParts(parts);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void engine.then(({ animate }) => {
          if (active) controls.push(...drawParts(parts, animate));
        }, noop);
      },
      { rootMargin: REVEAL_ROOT_MARGIN },
    );
    observer.observe(root);

    return () => {
      active = false;
      observer.disconnect();
      stopAll(controls);
      showParts(parts);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
