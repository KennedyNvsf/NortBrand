"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/*
 * Subtle fade between pages (Motion Spec › Global › Route change: 250 ms, opacity only;
 * globals.css [data-page-transition]). Rendered by (site)/template.tsx.
 * - The first mount is the document load: no fade (the splash and hero entrance cover
 *   it).
 * - Every later showing is a client-side navigation and fades in. With cacheComponents,
 *   Next.js keeps visited pages mounted but hidden (React <Activity>), so a page can be
 *   shown again without remounting. Layout effects re-run each time an Activity is
 *   shown, before paint, so the attribute is (re)applied here rather than rendered.
 * - Development only: Strict Mode runs effects twice on mount, so the first load fades
 *   there too.
 * The nav and footer live in the layout, so only the page changes.
 */
const ATTRIBUTE = "data-page-transition";
let documentLoaded = false;

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = ref.current;
    if (page && documentLoaded) {
      // Restart the animation if this page was shown before.
      page.removeAttribute(ATTRIBUTE);
      page.getBoundingClientRect(); // flushes styles so the re-added attribute restarts
      page.setAttribute(ATTRIBUTE, "");
    }
    documentLoaded = true;
  }, []);

  return <div ref={ref}>{children}</div>;
}
