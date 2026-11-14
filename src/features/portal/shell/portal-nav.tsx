"use client";

import {
  Calendar,
  Check,
  Mail,
  PanelLeft,
  Settings,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { ICON_STROKE } from "@/lib/icons";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Portal navigation (#133, Figma CP-03 / TM-01 and "Portal · Responsive rules" 560:2243).
 * One list of items, drawn four ways:
 *   sidebar  desktop, client and team workspace (232 px column)
 *   rail     desktop, team boards (icons only)
 *   tabs     tablet, under the top bar
 *   bottom   mobile, a bottom tab bar
 * The shell renders the variant each breakpoint needs; the others are display:none, so
 * only one is ever in the accessibility tree.
 *
 * Motion (14 Portal — Motion, "Tab change"): only the active marker moves, on the portal
 * tab spring; content swaps instantly. MotionConfig reducedMotion="user" makes the
 * marker jump instead. On first paint it sits in place (no animation).
 */

export type NavIcon =
  "overview" | "tasks" | "timeline" | "files" | "updates" | "settings";

export type PortalNavItem = {
  key: string;
  href: string;
  label: string;
  icon: NavIcon;
  count?: number;
  /** Also active on deeper URLs (`/team/projects/…`). The section root is exact. */
  matchNested?: boolean;
};

const ICONS: Record<NavIcon, LucideIcon> = {
  overview: PanelLeft,
  tasks: Check,
  timeline: Calendar,
  files: Share2,
  updates: Mail,
  settings: Settings,
};

type Box = { x: number; y: number; width: number; height: number };

function isActive(item: PortalNavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return Boolean(item.matchNested) && pathname.startsWith(`${item.href}/`);
}

export function PortalNav({
  items,
  label,
  variant,
  className,
}: {
  items: PortalNavItem[];
  label: string;
  variant: "sidebar" | "rail" | "tabs" | "bottom";
  className?: string;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const activeIndex = items.findIndex((item) => isActive(item, pathname));

  // Measure the active item; re-measure when the list resizes (fonts, breakpoints).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || variant === "bottom") return;
    const measure = () => {
      const target =
        list.querySelectorAll<HTMLElement>("[data-nav-item]")[activeIndex];
      setBox(
        target
          ? {
              x: target.offsetLeft,
              y: target.offsetTop,
              width: target.offsetWidth,
              height: target.offsetHeight,
            }
          : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      observer.disconnect();
    };
  }, [activeIndex, variant]);

  return (
    <nav aria-label={label} className={className}>
      <ul
        ref={listRef}
        className={cn(
          "relative",
          variant === "sidebar" && "flex flex-col gap-1",
          variant === "rail" && "flex flex-col items-center gap-2",
          variant === "tabs" &&
            "flex gap-lg overflow-x-auto border-b border-border-default px-(--gutter)",
          variant === "bottom" && "grid auto-cols-fr grid-flow-col",
        )}
      >
        {box && variant !== "bottom" ? (
          <m.span
            aria-hidden
            initial={false}
            animate={
              variant === "tabs"
                ? { x: box.x, width: box.width }
                : { y: box.y, height: box.height }
            }
            transition={motionTokens.spring.portalTab}
            className={cn(
              "pointer-events-none absolute",
              variant === "tabs"
                ? "bottom-0 left-0 h-0.5 bg-text-primary"
                : "top-0 left-0 w-full rounded-md bg-bg-primary",
            )}
          />
        ) : null}
        {items.map((item, index) => {
          const Icon = ICONS[item.icon];
          const active = index === activeIndex;
          return (
            <li key={item.key} className="relative">
              <Link
                href={item.href}
                data-nav-item
                aria-current={active ? "page" : undefined}
                aria-label={variant === "rail" ? item.label : undefined}
                title={variant === "rail" ? item.label : undefined}
                className={cn(
                  "relative flex items-center text-text-muted transition-colors duration-(--duration-fast) hover:text-text-primary",
                  active && "text-text-primary",
                  variant === "sidebar" &&
                    "h-[34px] gap-2.5 rounded-md px-2.5 text-[14px] font-medium",
                  variant === "sidebar" && active && "font-semibold",
                  variant === "rail" && "size-11 justify-center rounded-md",
                  variant === "tabs" &&
                    "h-11 shrink-0 text-[14px] font-medium whitespace-nowrap",
                  variant === "bottom" &&
                    "h-16 flex-col justify-center gap-1 text-[11px] font-medium",
                )}
              >
                {variant !== "tabs" ? (
                  <Icon
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className={cn(
                      "shrink-0",
                      variant === "bottom" ? "size-6" : "size-[18px]",
                    )}
                  />
                ) : null}
                {variant === "rail" ? null : (
                  <span className={cn(variant === "sidebar" && "flex-1")}>
                    {item.label}
                  </span>
                )}
                {variant === "sidebar" && item.count !== undefined ? (
                  <span className="text-[12px] font-medium text-text-muted tabular-nums">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
