import { sitePages } from "../../content/site-pages";
import { routing } from "../../i18n/routing";

/**
 * nortbrand.pt (and www.) redirects to the Portuguese site on the main domain (ADR-006:
 * "nortbrand.pt only redirects to nortbrand.com/pt"; the domain is not a locale of its
 * own). It runs in next.config.ts, before the proxy, so it never meets locale detection.
 * Vercel's domain-level redirect can't add the `/pt` prefix, hence the app does it.
 *
 *   /                      → /pt          the domain means Portuguese
 *   /en/…, /pt/…           → same path    an explicit locale is never overridden
 *   /services, /blog/x …   → /pt/…        a page path without a locale
 *   anything else          → same path    robots.txt, sitemap.xml, files, /studio, /api
 *
 * Relative imports only: next.config.ts loads this file, and its loader knows no path
 * aliases (like env.schema.ts and release-guard.ts).
 *
 * Permanent (308): the old domain should hand its links to the main one, and a 308 keeps
 * the method, so a stray POST is not turned into a GET.
 */

/** `nortbrand.pt` or `www.nortbrand.pt`; Next.js anchors it and strips the port. */
export const LEGACY_PT_HOST = String.raw`(?:www\.)?nortbrand\.pt`;

/**
 * The first segment of every page, from the sitemap's list, plus the newsletter link
 * pages (noindex, so not in `sitePages`, but real pages).
 */
export const pageSections = [
  ...new Set(
    sitePages
      .map((path) => path.split("/")[1])
      .filter((section): section is string => Boolean(section)),
  ),
  "newsletter",
];

export type HostRedirect = {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: true;
};

export function legacyDomainRedirects(siteUrl: string): HostRedirect[] {
  const origin = new URL(siteUrl).origin;
  const has = [{ type: "host" as const, value: LEGACY_PT_HOST }];
  const locales = routing.locales.join("|");
  const sections = pageSections.join("|");

  // Order matters: Next.js uses the first match.
  return [
    { source: "/", has, destination: `${origin}/pt`, permanent: true },
    {
      source: `/:locale(${locales})/:path*`,
      has,
      destination: `${origin}/:locale/:path*`,
      permanent: true,
    },
    {
      source: `/:section(${sections})/:path*`,
      has,
      destination: `${origin}/pt/:section/:path*`,
      permanent: true,
    },
    {
      source: "/:path*",
      has,
      destination: `${origin}/:path*`,
      permanent: true,
    },
  ];
}
