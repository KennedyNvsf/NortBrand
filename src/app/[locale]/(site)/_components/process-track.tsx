"use client";

import { useRef, type ReactNode } from "react";
import { m, useReducedMotion, useScroll } from "motion/react";

/*
 * The Home process "journey" (Motion Spec › Home › Process; Mobile › Process
 * connector): scroll-linked and linear, so the line follows the reader.
 * - Desktop: the red journey line (Figma vector 92:5) draws left to right as the steps
 *   cross the viewport (`pathLength` 0 → 1).
 * - Mobile: the connector behind the cards draws top to bottom (`scaleY`, origin top).
 * - Reduced motion: both are simply drawn (no path drawing, Motion Spec).
 * Decorative (aria-hidden). The step cards stay server-rendered, passed as children.
 */

const JOURNEY_PATH =
  "M48 88C130 50 180 140 250 110C290 95 320 130 344 124C420 160 460 20 520 45C580 65 610 30 640 60C710 90 750 20 800 50C860 75 900 55 936 88";

export function ProcessTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 60%"],
  });
  const drawn = reduced ? 1 : scrollYProgress;

  return (
    <div ref={ref} className="relative w-full lg:mx-auto lg:max-w-285 lg:pb-12">
      <svg
        aria-hidden
        viewBox="0 0 1140 180"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-x-0 top-0 hidden h-45 w-full text-action-primary lg:block"
      >
        <m.path
          d={JOURNEY_PATH}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: drawn }}
        />
      </svg>
      <m.span
        aria-hidden
        style={{ scaleY: drawn }}
        className="absolute top-12 bottom-12 left-12 w-0.5 origin-top -translate-x-1/2 rounded-full bg-action-primary/25 md:hidden"
      />
      {children}
    </div>
  );
}
