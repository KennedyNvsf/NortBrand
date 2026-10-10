import type { MetadataRoute } from "next";

import { localeAlternates } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";

/*
 * sitemap.xml and robots.txt content (brief, "SEO"), as pure functions so they can be
 * unit-tested; app/sitemap.ts and app/robots.ts only pass in the site URL and pages.
 * URLs reuse localeAlternates, so the sitemap's hreflang matches each page's <link>s.
 */

function absolute(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

/** One entry per page and locale, each listing every language version + x-default. */
export function buildSitemap(
  siteUrl: string,
  pages: readonly `/${string}`[],
): MetadataRoute.Sitemap {
  return pages.flatMap((page) =>
    routing.locales.map((locale) => {
      const { canonical, languages } = localeAlternates(locale, page);
      return {
        url: absolute(siteUrl, canonical),
        alternates: {
          languages: Object.fromEntries(
            Object.entries(languages).map(([language, path]) => [
              language,
              absolute(siteUrl, path),
            ]),
          ),
        },
      };
    }),
  );
}

/**
 * Production: crawl everything except the Sanity Studio and API routes, and point to
 * the sitemap. Preview deployments: disallow everything (pages are noindex as well).
 */
export function buildRobots(
  siteUrl: string,
  { preview }: { preview: boolean },
): MetadataRoute.Robots {
  if (preview) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api/"] },
    sitemap: absolute(siteUrl, "/sitemap.xml"),
  };
}
