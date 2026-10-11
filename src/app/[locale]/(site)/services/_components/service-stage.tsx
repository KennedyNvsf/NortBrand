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
import { m, useInView, useReducedMotion } from "motion/react";

import { RevealGroup } from "@/components/motion/reveal-group";
import {
  hide,
  isBelowFold,
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
 * navigation), desktop only and only when motion is allowed:
 * - The section is one stage-height per block tall; a sticky stage under the header
 *   shows one block at a time. Wheel, touch and arrow keys all work because it is
 *   ordinary page scroll; the stage unpins after block 5.
 * - Each time a block becomes active (and the first time the stage scrolls into view)
 *   its collage pops in on a spring, the dark square a beat later, then eyebrow,
 *   title, summary and button rise in, 100 ms apart (revised after #27 review, which
 *   found the plain crossfade too subtle). The outgoing block fades out in 150 ms.
 * - Dot navigation: the active dot grows 7 → 12 px and fills red (spring, snappy);
 *   clicking jumps to that block.
 * - Below desktop, or with reduced motion, the same markup is a plain vertical stack,
 *   and each block plays the same pop-and-stagger as it scrolls in (RevealGroup).
 *
 * Accessibility: all five articles stay in the DOM in reading order. Focusing anything
 * in a hidden block (Tab to its "More Details") scrolls to that block, and
 * /services#<slug> links land on the matching step.
 */

/** Sticky offset below the fixed header (top-24), in px. */
const HEADER_OFFSET = 96;

const PINNED_QUERY =
  "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";

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
  }, [pinned, count, range]);

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

  // Before the stage arrives, hide the first block's items so they can play in.
  // The section is five screens tall, so "in view" means its top has passed 60% of
  // the viewport (and it has not scrolled away entirely).
  const stageInView = useInView(sectionRef, { margin: "0px 0px -40% 0px" });
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const first = blockRefs.current[0];
    const section = sectionRef.current;
    if (!pinned || !first || !section || !isBelowFold(section)) return;
    const items = revealItemsOf(first);
    hide(items, prefersReducedMotion());
    return () => {
      for (const item of items) {
        item.style.opacity = "";
        item.style.transform = "";
      }
    };
  }, [pinned]);

  // Play the active block's entrance whenever it changes while the stage is on
  // screen. Layout effect: items are hidden before the browser paints the swap.
  useLayoutEffect(() => {
    const block = blockRefs.current[active];
    if (!pinned || !stageInView || !block) return;
    const controls = play(revealItemsOf(block), {
      reduced: prefersReducedMotion(),
    });
    return () => {
      stopAll(controls);
    };
  }, [pinned, stageInView, active]);

  return (
    <section
      ref={sectionRef}
      aria-label={label}
      style={sectionStyle}
      className="relative bg-bg-surface [--stage-h:calc(100dvh-6rem)] lg:motion-safe:h-[calc(var(--steps)*var(--stage-h))]"
    >
      <div className="lg:motion-safe:sticky lg:motion-safe:top-24 lg:motion-safe:h-(--stage-h) lg:motion-safe:overflow-hidden">
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
              "lg:motion-safe:absolute lg:motion-safe:inset-0 lg:motion-safe:flex lg:motion-safe:items-center lg:motion-safe:not-first:border-t-0",
              "lg:motion-safe:transition-opacity lg:motion-safe:duration-(--duration-fast) lg:motion-safe:ease-exit lg:motion-safe:data-[active=true]:duration-0",
              "lg:motion-safe:data-[active=false]:pointer-events-none lg:motion-safe:data-[active=false]:opacity-0",
              "lg:motion-safe:[&>*]:w-full",
            )}
          >
            {block}
          </RevealGroup>
        ))}

        <div className="pointer-events-none absolute inset-0 container-page hidden items-center justify-end lg:motion-safe:flex">
          <nav aria-label={dotsLabel} className="pointer-events-auto">
            <ol className="flex flex-col">
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
                      className="flex size-6 cursor-pointer items-center justify-center rounded-full"
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
                            : "border-[2.5px] border-border-default bg-transparent",
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
