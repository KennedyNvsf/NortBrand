/**
 * Motion tokens, as given in Figma 10 — Motion Spec › Implementation ("Start from
 * these tokens"). Seconds and cubic-bezier arrays for the Motion library; the same
 * values exist as CSS variables in globals.css (--duration-*, --ease-*) for CSS
 * transitions, so both stay one animation language.
 */
export const motionTokens = {
  duration: { instant: 0.1, fast: 0.15, base: 0.25, slow: 0.4, reveal: 0.7 },
  ease: {
    standard: [0.2, 0, 0, 1],
    exit: [0.4, 0, 1, 1],
    emphasized: [0.16, 1, 0.3, 1],
  },
  spring: {
    gentle: { type: "spring", stiffness: 120, damping: 20 },
    snappy: { type: "spring", stiffness: 300, damping: 30 },
  },
} as const;

/** Motion Spec › Global › Scroll reveal. */
export const revealSpec = {
  /** Vertical travel in px. */
  distance: 24,
  /** Delay between siblings, seconds. */
  stagger: 0.06,
  /** Share of the element that must be visible to trigger. */
  amount: 0.25,
} as const;

/** Motion Spec › Reduced motion: "opacity fades only, at 150ms or less". */
export const reducedMotionDuration = motionTokens.duration.fast;
