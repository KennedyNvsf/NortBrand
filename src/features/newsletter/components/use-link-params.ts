"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => undefined;

/**
 * The page's query string, or null while the static HTML is hydrating. The confirm
 * and unsubscribe pages are prerendered, so the link's `?email=&token=` is only known
 * in the browser; reading it here keeps the pages static (no `searchParams`).
 */
export function useLinkParams(): URLSearchParams | null {
  const search = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => null,
  );
  return search === null ? null : new URLSearchParams(search);
}
