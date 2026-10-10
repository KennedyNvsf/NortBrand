"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/*
 * "On this page" (Figma Legal 323:73; the Handoff's sticky TOC on blog posts reuses it).
 * Plain in-page anchor links; the only client behaviour is marking the section being
 * read: the last section whose heading has passed the reading line below the sticky
 * header, or the last section once the page bottom is reached. The active link gets
 * aria-current="location", a red rule and SemiBold text (not colour alone).
 */

export type TocItem = { id: string; label: string };

/* Below the sticky header (~88 px on desktop), with some breathing room. */
const READING_LINE = 120;

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

  return (
    <nav
      aria-labelledby="toc-label"
      className={cn("flex flex-col gap-md", className)}
    >
      <p id="toc-label" className="text-overline text-text-muted">
        {label}
      </p>
      <ol className="flex flex-col">
        {items.map(({ id, label: itemLabel }) => {
          const active = id === activeId;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "block border-l-2 py-1.75 pl-3.5 text-small transition-colors duration-(--duration-fast) ease-standard",
                  active
                    ? "border-action-primary font-semibold text-text-primary"
                    : "border-border-default font-medium text-text-muted hover:text-text-primary",
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
