"use client";

import { useEffect, useState, type ReactNode } from "react";

import { isOverlayRoute } from "@/content/navigation";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * The sticky shell around SiteNav, and the only part of the header that needs scroll
 * position. Everything inside (logo, links, buttons) stays server-rendered and is passed
 * in as children.
 * - Handoff › Behavior: "Navigation is sticky. A hairline fades in after 8px of scroll."
 * - Overlay routes (the Services photo hero): the header is fixed over the photo,
 *   transparent with white content at the top, and turns solid once scrolled.
 *   `data-tone` lets children style themselves with `group-data-[tone=overlay]/header:`.
 */
const SCROLL_THRESHOLD = 8;

export function SiteHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const overlayRoute = isOverlayRoute(pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  const tone = overlayRoute && !scrolled ? "overlay" : "default";

  return (
    <header
      data-tone={tone}
      data-scrolled={scrolled || undefined}
      className={cn(
        "group/header top-0 z-40 w-full border-b",
        "transition-[background-color,border-color,color] duration-(--duration-fast) ease-standard",
        overlayRoute ? "fixed inset-x-0" : "sticky",
        tone === "overlay"
          ? "border-transparent bg-transparent text-text-on-accent"
          : "bg-bg-surface text-text-primary",
        tone === "default" &&
          (scrolled ? "border-border-default" : "border-transparent"),
      )}
    >
      {children}
    </header>
  );
}
