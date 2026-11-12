"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefCallback,
} from "react";
import type { AnimationPlaybackControls } from "motion/react";

import { loadRevealEngine } from "./load-reveal-engine";
import {
  hide,
  isBelowFold,
  prefersReducedMotion,
  REVEAL_ROOT_MARGIN,
  revealItemsOf,
  stopAll,
  unhide,
} from "./reveal-dom";

/*
 * Scroll reveal for a section (Motion Spec › Global, revised after #27 review). The
 * group is a plain <div>; the elements it animates are marked with revealItem() and
 * stay server-rendered.
 * - Items reveal as they scroll in, in document order: items that arrive together are
 *   staggered 100 ms apart (the image panel first, then eyebrow, title, copy, list).
 *   Each item is observed on its own, so a tall mobile stack reveals card by card.
 * - Never hides content the reader can already see: only items still below the fold
 *   after mount are hidden. Above the fold, before hydration and without JavaScript,
 *   the page is simply there.
 * - The animating half of the engine loads after hydration (loadRevealEngine, #105).
 *   Items that arrive before it has loaded play as soon as it has; if it fails to
 *   load, every hidden item is shown.
 * - `disabled`: a parent that drives the items itself.
 * - `contents`: the group adds no box (display: contents), for wrapping a flex child.
 */

const noop = () => undefined;

type RevealGroupProps = {
  children: ReactNode;
  ref?: RefCallback<HTMLDivElement>;
  disabled?: boolean;
  contents?: boolean;
} & Omit<ComponentPropsWithoutRef<"div">, "children">;

export function RevealGroup({
  children,
  disabled = false,
  contents = false,
  className,
  ref: forwardRef,
  ...props
}: RevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      ref.current = element;
      forwardRef?.(element);
    },
    [forwardRef],
  );

  useEffect(() => {
    const root = ref.current;
    if (!root || disabled) return;

    const pending = revealItemsOf(root).filter(isBelowFold);
    if (pending.length === 0) return;
    const reduced = prefersReducedMotion();
    hide(pending, reduced);

    let active = true;
    const controls: AnimationPlaybackControls[] = [];
    const engine = loadRevealEngine();
    engine.catch(() => {
      if (active) unhide(pending);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const arrived = pending.filter((item) =>
          entries.some(
            (entry) => entry.isIntersecting && entry.target === item,
          ),
        );
        if (arrived.length === 0) return;
        for (const item of arrived) observer.unobserve(item);
        void engine.then(({ play }) => {
          if (active) controls.push(...play(arrived, { reduced }));
        }, noop);
      },
      { rootMargin: REVEAL_ROOT_MARGIN },
    );
    for (const item of pending) observer.observe(item);

    return () => {
      active = false;
      observer.disconnect();
      stopAll(controls);
      // Leave nothing hidden if the group is disabled or unmounted mid-way.
      unhide(pending);
    };
  }, [disabled]);

  return (
    <div
      ref={setRef}
      data-reveal-group=""
      className={contents ? "contents" : className}
      {...props}
    >
      {children}
    </div>
  );
}
