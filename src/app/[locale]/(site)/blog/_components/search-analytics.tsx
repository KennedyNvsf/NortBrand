"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

/*
 * GA4 `blog_search` (#43, brief › GA4): sent when a search's results render. Only the
 * term's length and the result count leave the page, never the words typed. A no-op
 * without analytics consent.
 */
export function SearchAnalytics({
  q,
  results,
}: {
  q: string;
  results: number;
}) {
  useEffect(() => {
    if (q) trackEvent("blog_search", { term_length: q.length, results });
  }, [q, results]);
  return null;
}
