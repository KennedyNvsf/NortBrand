"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

/*
 * Root of every Motion animation (ticket #27).
 * - LazyMotion + `m.*` components: the feature bundle is fetched only when the first
 *   animated component mounts (brief: "Motion is lazy-loaded with its components").
 *   `strict` makes a stray `motion.*` import fail loudly instead of silently loading
 *   the full bundle.
 * - MotionConfig reducedMotion="user": with prefers-reduced-motion, Motion drops
 *   transforms and keeps opacity (Motion Spec › Reduced motion). Imperative animations
 *   (Reveal) branch on useReducedMotion() themselves.
 */

const loadFeatures = () =>
  import("./motion-features").then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
