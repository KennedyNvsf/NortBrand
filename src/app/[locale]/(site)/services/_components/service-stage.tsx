"use client";

import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { m, useMotionValue, useReducedMotion } from "motion/react";

import { RevealGroup } from "@/components/motion/reveal-group";
import {
  hide,
  play,
  prefersReducedMotion,
  revealItemsOf,
  stopAll,
} from "@/components/motion/reveal-engine";
import { motionTokens } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

/*
 * The Services "scroll-through stage" (Motion Spec › Services › Service blocks and Dot
 * navigation), on desktop screens tall enough for a block (`stage:` in globals.css),
 * and only when motion is allowed:
 * - The section is one stage-height per block tall; a sticky stage under the header
 *   shows one block at a time. Wheel, touch and arrow keys all work because it is
 *   ordinary page scroll; the stage unpins after block 5.
 * - Each time a block becomes active (and the first time the stage scrolls into view)
 *   its collage pops in on a spring, the dark square a beat later, then eyebrow,
 *   title, summary and button rise in, 100 ms apart (revised after #27 review, which
 *   found the plain crossfade too subtle). The outgoing block fades out in 150 ms.
 * - Dot navigation: the active dot grows 7 → 12 px and fills red (spring, snappy);
 *   clicking jumps to that block. A hairline behind the dots fills red with the
 *   reader's progress through the stage.
 * - Below desktop, on short screens, or with reduced motion, the same markup is a plain vertical stack,
 *   and each block plays the same pop-and-stagger as it scrolls in (RevealGroup).
 *
 * Accessibility: all five articles stay in the DOM in reading order. Focusing anything
 * in a hidden block (Tab to its "More Details") scrolls to that block, and
 * /services#<slug> links land on the matching step.
 */

/** Sticky offset below the fixed header (top-24), in px. */
const HEADER_OFFSET = 96;

/** Same condition as the `stage:` variant in globals.css (desktop, motion, tall enough). */
const PINNED_QUERY =
  "(min-width: 64rem) and (min-height: 42rem) and (prefers-reduced-motion: no-preference)";

type Step = { slug: string; name: string };

export function ServiceStage({
  label,
  dotsLabel,
  steps,
  children,
}: {
  label: string;
  dotsLabel: string;
  steps: Step[];
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinned = useMediaQuery(PINNED_QUERY);
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  /* Where the reader is relative to the pinned range. */
  const [phase, setPhase] = useState<"before" | "in" | "after">("before");
  /* 0 → 1 through the pinned range, for the dot progress line. */
  const progressValue = useMotionValue(0);
  const blocks = Children.toArray(children);
  const count = blocks.length;
  const sectionStyle: CSSProperties & { "--steps": number } = {
    "--steps": count,
  };

  /* Scroll range of the pinned section: from the stage sticking to it releasing. */
  const range = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return null;
    const start =
      section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    const distance =
      section.offsetHeight - (window.innerHeight - HEADER_OFFSET);
    return { start, distance: Math.max(distance, 1) };
  }, []);

  const scrollToStep = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const bounds = range();
      if (!bounds) return;
      window.scrollTo({
        top: bounds.start + (bounds.distance * (index + 0.5)) / count,
        behavior,
      });
      setActive(index);
    },
    [count, range],
  );

  // Active step follows the scroll position.
  useEffect(() => {
    if (!pinned) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = range();
        if (!bounds) return;
        const progress = (window.scrollY - bounds.start) / bounds.distance;
        // A 2 px tolerance: anchors and dots land exactly on the boundary.
        const tolerance = 2 / bounds.distance;
        setPhase(
          progress < -tolerance ? "before" : progress > 1 ? "after" : "in",
        );
        progressValue.set(Math.min(1, Math.max(0, progress)));
        setActive(
          Math.min(count - 1, Math.max(0, Math.floor(progress * count))),
        );
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pinned, count, range, progressValue]);

  // /services#<slug>: the browser jumps to the article; move to its step instead.
  useEffect(() => {
    if (!pinned) return;
    const goToHash = () => {
      const index = steps.findIndex(
        (step) => `#${step.slug}` === window.location.hash,
      );
      if (index >= 0) {
        requestAnimationFrame(() => {
          scrollToStep(index, "instant");
        });
      }
    };
    goToHash();
    window.addEventListener("hashchange", goToHash);
    return () => {
      window.removeEventListener("hashchange", goToHash);
    };
  }, [pinned, steps, scrollToStep]);

  // A block only appears once the stage has pinned: approaching from above, the
  // block waits hidden (revised after review: "not supposed to be in view before
  // arriving at the section"), then plays as the stage locks in place; scrolling back
  // above the stage hides it again so the next arrival replays.
  // Hiding is a passive effect on purpose: it must run after the blocks' own
  // RevealGroups have cleaned up (they are enabled for the first commit, until the
  // media query resolves, and restore their items when disabled).
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const block = blockRefs.current[active];
    if (!pinned || phase !== "before" || !block) return;
    hide(revealItemsOf(block), prefersReducedMotion());
  }, [pinned, phase, active]);

  // Each step plays its entrance. Layout effect: items are hidden before the
  // browser paints the swap.
  useLayoutEffect(() => {
    const block = blockRefs.current[active];
    if (!pinned || phase !== "in" || !block) return;
    const controls = play(revealItemsOf(block), {
      reduced: prefersReducedMotion(),
    });
    return () => {
      stopAll(controls);
    };
  }, [pinned, phase, active]);

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      style={sectionStyle}
      className="relative bg-bg-surface [--stage-h:calc(100dvh-6rem)] stage:h-[calc(var(--steps)*var(--stage-h))]"
    >
      <div className="stage:sticky stage:top-24 stage:h-(--stage-h) stage:overflow-hidden">
        {blocks.map((block, index) => (
          <RevealGroup
            key={steps[index]?.slug ?? index}
            ref={(element) => {
              blockRefs.current[index] = element;
            }}
            disabled={pinned}
            data-active={index === active}
            onFocusCapture={() => {
              if (pinned && index !== active) scrollToStep(index, "instant");
            }}
            className={cn(
              "border-border-default not-first:border-t",
              "stage:absolute stage:inset-0 stage:flex stage:items-center stage:not-first:border-t-0",
              "stage:transition-opacity stage:duration-(--duration-fast) stage:ease-exit stage:data-[active=true]:duration-0",
              "stage:data-[active=false]:pointer-events-none stage:data-[active=false]:opacity-0",
              "stage:[&>*]:w-full",
            )}
          >
            {block}
          </RevealGroup>
        ))}

        <div className="pointer-events-none absolute inset-0 container-page hidden items-center justify-end stage:flex">
          <nav
            aria-label={dotsLabel}
            className={cn(
              "pointer-events-auto transition-opacity duration-(--duration-base) ease-standard",
              // Arrive with the stage, like its blocks; keyboard focus always shows them.
              phase === "before" && "opacity-0 focus-within:opacity-100",
            )}
          >
            <ol className="relative flex flex-col">
              {/* Progress through the five blocks: a hairline between the first and
                  last dot centres, filling red as the reader scrolls. */}
              <span
                aria-hidden
                className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-border-default"
              />
              <m.span
                aria-hidden
                style={{ scaleY: progressValue }}
                className="absolute inset-y-3 left-1/2 w-px origin-top -translate-x-1/2 bg-action-primary"
              />
              {steps.map((step, index) => {
                const current = index === active;
                return (
                  <li key={step.slug}>
                    <button
                      type="button"
                      aria-label={step.name}
                      aria-current={current ? "step" : undefined}
                      onClick={() => {
                        scrollToStep(index, reduced ? "auto" : "smooth");
                      }}
                      className="relative flex size-6 cursor-pointer items-center justify-center rounded-full"
                    >
                      <m.span
                        aria-hidden
                        initial={false}
                        animate={{ scale: current ? 1 : 7 / 12 }}
                        transition={motionTokens.spring.snappy}
                        className={cn(
                          "size-3 rounded-full transition-colors duration-(--duration-fast) ease-standard",
                          current
                            ? "bg-action-primary"
                            : "border-[2.5px] border-border-default bg-bg-surface",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </section>
  );
}
