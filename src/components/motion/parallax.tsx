"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

import { MEDIA_LG, useMediaQuery } from "@/lib/use-media-query";

/*
 * Scroll parallax (Motion Spec › logomark panel parallax): the content drifts from
 * +distance to -distance px as its container crosses the viewport, so it moves a
 * little slower than the page. Desktop only, none with reduced motion.
 * The wrapper never changes element type: switching after hydration would remount
 * the children and drop state that other components hold on them (a RevealGroup
 * keeps references to the items it hid). Decorative content only.
 */
export function Parallax({
  children,
  distance = 24,
  className,
}: {
  children: ReactNode;
  /** Travel each way, px. */
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isLg = useMediaQuery(MEDIA_LG);
  const reduced = useReducedMotion() ?? false;
  const enabled = useRef(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, (progress) =>
    enabled.current ? distance * (1 - 2 * progress) : 0,
  );

  useEffect(() => {
    enabled.current = isLg && !reduced;
    y.set(enabled.current ? distance * (1 - 2 * scrollYProgress.get()) : 0);
  }, [isLg, reduced, distance, y, scrollYProgress]);

  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
