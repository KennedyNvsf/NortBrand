"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "motion/react";

import { prefersReducedMotion } from "@/components/motion/reveal-engine";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * "On this page" (Figma Legal 323:73; the blog post's sticky TOC 285:99 reuses it).
 * Plain in-page anchor links; the only client behaviour is marking the section being
 * read: the last section whose heading has passed the reading line below the sticky
 * header, or the last section once the page bottom is reached. The active link gets
 * aria-current="location" and SemiBold text (not colour alone).
 * - The red marker on the rail slides to the active link (Motion Spec › Blog › Table of
 *   contents: spring gentle). It is a 1 px bar scaled to the link's height, as the nav
 *   underline is, so only transforms animate. It appears in place the first time and
 *   always moves without travel under reduced motion. Before hydration (or without
 *   JavaScript) the active link draws its own red rule instead.
 */

export type TocItem = { id: string; label: string };

/* Below the sticky header (~93 px on desktop), with some breathing room. */
const READING_LINE = 120;
const SLIDE = motionTokens.spring.gentle;

function findActiveId(items: TocItem[]): string | undefined {
  const atBottom =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 2;
  if (atBottom) return items.at(-1)?.id;

  let active = items[0]?.id;
  for (const { id } of items) {
    const section = document.getElementById(id);
    if (section && section.getBoundingClientRect().top <= READING_LINE) {
      active = id;
    }
  }
  return active;
}

export function TableOfContents({
  items,
  label,
  className,
}: {
  items: TocItem[];
  label: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [placed, setPlaced] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setActiveId(findActiveId(items));
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
  }, [items]);

  // Move the marker to the active link; re-place it (without travel) on resize.
  useLayoutEffect(() => {
    const list = listRef.current;
    const marker = markerRef.current;
    if (!list || !marker || !activeId) return;

    const place = (instant: boolean) => {
      const link = list.querySelector<HTMLElement>(
        `a[href="#${CSS.escape(activeId)}"]`,
      );
      if (!link) return;
      const target = { y: link.offsetTop, scaleY: link.offsetHeight };
      animate(
        marker,
        target,
        instant || prefersReducedMotion() ? { duration: 0 } : SLIDE,
      );
    };

    place(!shown.current);
    shown.current = true;
    setPlaced(true);

    const onResize = () => {
      place(true);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [activeId]);

  return (
    <nav
      aria-labelledby="toc-label"
      className={cn("flex flex-col gap-md", className)}
    >
      <p id="toc-label" className="text-overline text-text-muted">
        {label}
      </p>
      <ol ref={listRef} className="relative flex flex-col">
        <span
          ref={markerRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 h-px w-0.5 origin-top bg-action-primary",
            !placed && "opacity-0",
          )}
        />
        {items.map(({ id, label: itemLabel }) => {
          const active = id === activeId;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "block border-l-2 py-1.75 pl-3.5 text-small transition-colors duration-(--duration-fast) ease-standard",
                  active && !placed
                    ? "border-action-primary"
                    : "border-border-default",
                  active
                    ? "font-semibold text-text-primary"
                    : "font-medium text-text-muted hover:text-text-primary",
                )}
              >
                {itemLabel}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
