import { notFound } from "next/navigation";

/*
 * Render unknown paths completely on the server. Without this, Partial Prefetching
 * serves an empty fallback shell for an unlisted param and resolves notFound() in the
 * browser, so the 404 would have no server HTML or title.
 */
export const ensureStatic = "navigation";

/*
 * `navigation` requires params to be listed: one sample path is prerendered for both
 * locales; any other unknown path renders on its first request and is then cached.
 */
export function generateStaticParams() {
  return [{ rest: ["no-such-page"] }];
}

/*
 * Catch-all for paths under /en and /pt that match no page. Calling notFound() renders
 * [locale]/not-found.tsx inside the locale layout, with a 404 status, instead of the
 * framework's unstyled fallback.
 */
export default function CatchAll(): never {
  notFound();
}
