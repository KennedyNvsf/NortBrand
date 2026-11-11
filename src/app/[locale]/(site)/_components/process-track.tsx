"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { AnimationPlaybackControls } from "motion/react";

import { loadRevealEngine } from "@/components/motion/load-reveal-engine";
import {
  hide,
  isBelowFold,
  prefersReducedMotion,
  stopAll,
  unhide,
} from "@/components/motion/reveal-dom";
import { RevealGroup } from "@/components/motion/reveal-group";
import { REVEAL_ITEM } from "@/components/motion/reveal-item";
import { motionTokens, revealSpec } from "@/lib/motion";
import { MEDIA_LG, useMediaQuery } from "@/lib/use-media-query";

/*
 * The Home process "journey" (Motion Spec › Home › Process; Mobile › Process
 * connector), revised after #27 review: the line is no longer tied to the scroll
 * position. It plays once, as a short story, when the section is in view.
 * - Desktop: once 60% of the steps are on screen, the red journey line (Figma vector
 *   92:5) draws left to right over 1.6 s, and each step card rises in as the line
 *   reaches it.
 * - Tablet and mobile: the cards reveal one by one as they scroll in (RevealGroup);
 *   on mobile the connector behind them draws top to bottom when the list arrives.
 * - Nothing is hidden if the section is already on screen when the page loads.
 * - Reduced motion: the line is simply drawn, the cards fade in (150 ms).
 * - Motion loads after hydration (loadRevealEngine, #105); if it fails, everything is
 *   shown at once.
 * Decorative (aria-hidden). The step cards stay server-rendered, passed as children.
 */

const JOURNEY_PATH =
  "M48 88C130 50 180 140 250 110C290 95 320 130 344 124C420 160 460 20 520 45C580 65 610 30 640 60C710 90 750 20 800 50C860 75 900 55 936 88";

/** When each card appears, in seconds: roughly where the line passes it. */
const CARD_DELAYS = [0.1, 0.45, 0.8, 1.15];

/** Desktop: start once this share of the steps is visible (or the top is high enough). */
const DESKTOP_AMOUNT = 0.6;
const MOBILE_AMOUNT = 0.15;
const THRESHOLDS = Array.from({ length: 11 }, (_, step) => step / 10);

const noop = () => undefined;

export function ProcessTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const connectorRef = useRef<HTMLSpanElement>(null);
  const isLg = useMediaQuery(MEDIA_LG, true);

  useEffect(() => {
    const root = ref.current;
    const path = pathRef.current;
    const connector = connectorRef.current;
    if (!root || !path || !connector || !isBelowFold(root)) return;

    const reduced = prefersReducedMotion();
    const cards = isLg
      ? Array.from(root.querySelectorAll<HTMLElement>(`[${REVEAL_ITEM}]`))
      : [];
    const amount = isLg ? DESKTOP_AMOUNT : MOBILE_AMOUNT;

    hide(cards, reduced);
    if (!reduced) {
      path.style.strokeDashoffset = "1";
      connector.style.transform = "scaleY(0)";
    }

    const reset = () => {
      unhide(cards);
      path.style.strokeDashoffset = "";
      connector.style.transform = "";
    };
    let active = true;
    const controls: AnimationPlaybackControls[] = [];
    const engine = loadRevealEngine();
    engine.catch(() => {
      if (active) reset();
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const arrived =
          entry.intersectionRatio >= amount ||
          (entry.isIntersecting &&
            entry.boundingClientRect.top < window.innerHeight * 0.3);
        if (!arrived) return;
        observer.disconnect();

        void engine.then(({ animate, play }) => {
          if (!active) return;
          controls.push(...play(cards, { reduced, delays: CARD_DELAYS }));
          if (reduced) return;
          const line = {
            duration: revealSpec.lineDuration,
            ease: motionTokens.ease.draw,
          };
          controls.push(
            isLg
              ? animate(path, { strokeDashoffset: [1, 0] }, line)
              : animate(connector, { scaleY: [0, 1] }, line),
          );
        }, noop);
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(root);

    return () => {
      active = false;
      observer.disconnect();
      stopAll(controls);
      reset();
    };
  }, [isLg]);

  return (
    <div ref={ref} className="relative w-full lg:mx-auto lg:max-w-285 lg:pb-12">
      <svg
        aria-hidden
        viewBox="0 0 1140 180"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-x-0 top-0 hidden h-45 w-full text-action-primary lg:block"
      >
        <path
          ref={pathRef}
          d={JOURNEY_PATH}
          pathLength={1}
          strokeDasharray={1}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        ref={connectorRef}
        aria-hidden
        className="absolute top-12 bottom-12 left-12 w-0.5 origin-top -translate-x-1/2 rounded-full bg-action-primary/25 md:hidden"
      />
      <RevealGroup contents disabled={isLg}>
        {children}
      </RevealGroup>
    </div>
  );
}
