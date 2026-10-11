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

/**
 * Scroll reveals (Motion Spec › Global, revised with the team after #27 review: "the
 * animations are way too subtle"). Same easing and duration as the spec; more travel
 * and a wider stagger so each element reads as its own beat.
 */
export const revealSpec = {
  /** Vertical travel of a rising element ("up"), px. Spec: 24. */
  distance: 32,
  /** Horizontal travel of a sliding panel ("left" / "right"), px. */
  slide: 64,
  /** Start scale of a popping image ("pop"). */
  popScale: 0.88,
  /** Delay between items revealed together, seconds. Spec: 0.06. */
  stagger: 0.1,
  /** Stroke drawing ("draw"), seconds. */
  drawDuration: 1.2,
  /** In-out, so a stroke is seen travelling rather than appearing at once. */
  drawEase: [0.65, 0, 0.35, 1],
} as const;

/** "pop": a spring with a small overshoot, so images land rather than fade. */
export const popSpring = {
  type: "spring",
  stiffness: 260,
  damping: 20,
} as const;

/** Motion Spec › Reduced motion: "opacity fades only, at 150ms or less". */
export const reducedMotionDuration = motionTokens.duration.fast;
