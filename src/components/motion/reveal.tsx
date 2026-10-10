"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

import { MEDIA_LG, useMediaQuery } from "@/lib/use-media-query";
import { motionTokens, reducedMotionDuration, revealSpec } from "@/lib/motion";

/*
 * Scroll reveal (Motion Spec › Global): fade up on first view, opacity 0→1 and
 * y 24→0, 700 ms emphasized, siblings 60 ms apart (`index`), once, at 25% visible.
 *
 * Never hides content the reader could already see:
 * - The server renders it visible. Only after mount, and only if it is still below the
 *   fold, is it set to its hidden start state ("armed"). Content above the fold, slow
 *   connections before hydration and visitors without JavaScript all just see the page.
 * - Reduced motion: opacity only, 150 ms (Motion Spec › Reduced motion).
 * `below` limits the reveal to small screens (e.g. Services blocks, which pin on
 * desktop instead). Always a <div>: inside a list, put it in the <li>.
 */

type RevealProps = {
  children: ReactNode;
  /** Position among revealed siblings, for the 60 ms stagger. */
  index?: number;
  /** Only reveal below this breakpoint ("lg": phones and tablets). */
  below?: "lg";
} & Omit<ComponentPropsWithoutRef<"div">, "children">;

export function Reveal({ children, index = 0, below, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const armed = useRef(false);
  const reduced = useReducedMotion() ?? false;
  const isLg = useMediaQuery(MEDIA_LG, true);
  const enabled = below === "lg" ? !isLg : true;
  const inView = useInView(ref, { once: true, amount: revealSpec.amount });

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || armed.current) return;
    if (element.getBoundingClientRect().top <= window.innerHeight) return;

    armed.current = true;
    element.style.opacity = "0";
    if (!reduced)
      element.style.transform = `translateY(${revealSpec.distance}px)`;
  }, [enabled, reduced]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !inView || !armed.current) return;

    const delay = index * revealSpec.stagger;
    const controls = reduced
      ? animate(
          element,
          { opacity: 1 },
          { duration: reducedMotionDuration, delay },
        )
      : animate(
          element,
          { opacity: 1, transform: "translateY(0px)" },
          {
            duration: motionTokens.duration.reveal,
            ease: motionTokens.ease.emphasized,
            delay,
          },
        );
    return () => {
      controls.stop();
    };
  }, [inView, index, reduced]);

  return (
    <div ref={ref} data-reveal="" {...props}>
      {children}
    </div>
  );
}
