import { notFound } from "next/navigation";

/*
 * Render unknown paths completely on the server. Without this, Partial Prefetching
 * serves an empty fallback shell for an unlisted param and resolves notFound() in the
 * browser, so the 404 would have no server HTML or title.
 */
export const ensureStatic = "navigation";

/*
 * `navigation` requires every param to be listed. /blog is the one known unbuilt page
 * (it stays in the nav, CLAUDE.md), so its 404 is prerendered for both locales; any
 * other path renders on its first request and is then cached.
 */
export function generateStaticParams() {
  return [{ rest: ["blog"] }];
}

/*
 * Catch-all for paths under /en and /pt that match no page (e.g. /en/blog until the
 * blog ships). Calling notFound() renders [locale]/not-found.tsx inside the locale
 * layout, with a 404 status, instead of the framework's unstyled fallback.
 */
export default function CatchAll(): never {
  notFound();
}
