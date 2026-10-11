"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate } from "motion/react";

import { play, prefersReducedMotion } from "@/components/motion/reveal-engine";
import { REVEAL_ITEM, revealItem } from "@/components/motion/reveal-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/*
 * The interactive half of Services › Talking Points (tablet and desktop), revised after
 * #27 review ("feels very bland"):
 * - One red accent travels between the points instead of blinking from one to the
 *   next: it springs to the selected point and stretches while it moves, like a drop.
 *   The selected title slides right to make room for it.
 * - On every change the selected point's media, title, copy and button slide in from
 *   the right, 60 ms apart; the previous content leaves at once.
 * - Before hydration (and without JavaScript) each selected point shows its own static
 *   accent; the travelling one takes over once it has been measured.
 * - Reduced motion: the accent jumps, the content fades in (150 ms).
 * Radix Tabs keep roles, roving focus and arrow keys; `panels` stay server-rendered.
 */

type Point = { key: string; title: string };

/** Springy but settled: arrives in ~350 ms with a hint of overshoot. */
const ACCENT_SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;
const PANEL_STAGGER = 0.06;

export function ApproachTabs({
  labelledBy,
  points,
  header,
  panels,
  children,
  className,
}: {
  /** Id of the section heading, which also names the tab list. */
  labelledBy: string;
  points: Point[];
  header: ReactNode;
  /** One server-rendered panel per point, in the same order. */
  panels: ReactNode[];
  /** Rendered after the panels (the mobile accordion). */
  children?: ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(points[0]?.key ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const accentRef = useRef<HTMLSpanElement>(null);
  const panelRefs = useRef(new Map<string, HTMLDivElement>());
  const previous = useRef(value);

  // Keep the accent on the selected point: instantly on mount and resize, with the
  // spring and stretch when the selection changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    const accent = accentRef.current;
    if (!list || !accent) return;

    const place = (instant: boolean) => {
      const trigger = list.querySelector<HTMLElement>(
        `[data-point="${value}"]`,
      );
      if (!trigger) return;
      const y =
        trigger.offsetTop + (trigger.offsetHeight - accent.offsetHeight) / 2;
      if (instant || prefersReducedMotion()) {
        animate(accent, { y }, { duration: 0 });
        return;
      }
      animate(accent, { y }, ACCENT_SPRING);
      animate(
        accent,
        { scaleY: [1, 2.2, 1] },
        { duration: 0.45, times: [0, 0.35, 1], ease: "easeInOut" },
      );
    };

    const changed = previous.current !== value;
    place(!changed || list.dataset.accent === undefined);
    list.dataset.accent = "";

    const observer = new ResizeObserver(() => {
      place(true);
    });
    observer.observe(list);
    return () => {
      observer.disconnect();
    };
  }, [value]);

  // Slide the newly selected content in from the right.
  useLayoutEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    const panel = panelRefs.current.get(value);
    if (!panel) return;
    const controls = play(
      Array.from(panel.querySelectorAll<HTMLElement>(`[${REVEAL_ITEM}]`)),
      { reduced: prefersReducedMotion(), stagger: PANEL_STAGGER },
    );
    return () => {
      for (const control of controls) control.stop();
    };
  }, [value]);

  return (
    <Tabs
      value={value}
      onValueChange={setValue}
      orientation="vertical"
      className={className}
    >
      {header}

      <TabsList
        ref={listRef}
        aria-labelledby={labelledBy}
        className="group/list relative hidden flex-col md:col-start-1 md:row-start-2 md:flex"
      >
        <span
          ref={accentRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-3.5 h-5.5 w-0.75 rounded-[2px] bg-action-primary opacity-0 group-data-accent/list:opacity-100"
        />
        {points.map(({ key, title }) => (
          <TabsTrigger
            key={key}
            value={key}
            data-point={key}
            {...revealItem()}
            className="group/tab relative flex min-h-11 items-center border-t border-border-default py-lg text-h4 text-text-muted transition-colors duration-(--duration-fast) ease-standard first:border-t-0 hover:text-text-primary data-[state=active]:font-semibold data-[state=active]:text-text-primary"
          >
            {/* Figma: the selected title sits 14 px in, after a 3 px accent and a
                10 px gap (27 px). A translate, so selecting causes no reflow. */}
            {/* Static accent until the travelling one is placed. */}
            <span
              aria-hidden
              className="absolute top-1/2 left-3.5 hidden h-5.5 w-0.75 -translate-y-1/2 rounded-[2px] bg-action-primary group-data-accent/list:hidden group-data-[state=active]/tab:block"
            />
            <span className="transition-transform duration-(--duration-base) ease-emphasized group-data-[state=active]/tab:translate-x-[--spacing(6.75)]">
              {title}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {points.map(({ key }, index) => (
        <TabsContent
          key={key}
          value={key}
          // Always rendered (CSS hides the inactive ones): Radix would otherwise mount
          // a newly selected panel's children one commit late, after the slide-in
          // effect has already looked for them.
          forceMount
          ref={(element) => {
            if (element) panelRefs.current.set(key, element);
            else panelRefs.current.delete(key);
          }}
          className="hidden flex-col items-start gap-5 md:col-start-2 md:row-span-2 md:row-start-1 md:data-[state=active]:flex lg:gap-lg"
        >
          {panels[index]}
        </TabsContent>
      ))}

      {children}
    </Tabs>
  );
}
