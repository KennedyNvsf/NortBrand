"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefCallback,
} from "react";
import {
  hide,
  isBelowFold,
  play,
  prefersReducedMotion,
  revealItemsOf,
  stopAll,
} from "./reveal-engine";

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
 * - `disabled`: a parent that drives the items itself (ServiceStage on desktop).
 * - `contents`: the group adds no box (display: contents), for wrapping a flex child.
 */

/** Reveal once the item's top is 12% above the bottom of the viewport. */
const ROOT_MARGIN = "0px 0px -12% 0px";

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

    const controls: ReturnType<typeof play> = [];
    const observer = new IntersectionObserver(
      (entries) => {
        const arrived = pending.filter((item) =>
          entries.some(
            (entry) => entry.isIntersecting && entry.target === item,
          ),
        );
        if (arrived.length === 0) return;
        for (const item of arrived) observer.unobserve(item);
        controls.push(...play(arrived, { reduced }));
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const item of pending) observer.observe(item);

    return () => {
      observer.disconnect();
      stopAll(controls);
      // Leave nothing hidden if the group is disabled or unmounted mid-way.
      for (const item of pending) {
        item.style.opacity = "";
        item.style.transform = "";
        item.style.strokeDashoffset = "";
      }
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
