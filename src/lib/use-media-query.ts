"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. During server rendering and hydration it returns
 * `serverValue`, then the real match, so markup never mismatches. Use it only where
 * the two branches need different components (Dialog vs Drawer); for anything CSS can
 * express, use responsive classes instead.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tablet and up (globals.css --breakpoint-md). */
export const MEDIA_MD = "(min-width: 48rem)";

/** Desktop and up (globals.css --breakpoint-lg). */
export const MEDIA_LG = "(min-width: 64rem)";
