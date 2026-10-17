import type { MetadataRoute } from "next";

import { localeAlternates } from "@/i18n/metadata";
import { routing, type Locale } from "@/i18n/routing";

/*
 * sitemap.xml and robots.txt content (brief, "SEO"), as pure functions so they can be
 * unit-tested; app/sitemap.ts and app/robots.ts only pass in the site URL and pages.
 * URLs reuse localeAlternates, so the sitemap's hreflang matches each page's <link>s.
 */

function absolute(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

/** A page whose address differs per language (a blog post), as the sitemap needs it. */
export type SitemapPost = {
  locale: Locale;
  path: `/${string}`;
  /** The post's path in each language it really exists in (its hreflang set). */
  paths: Partial<Record<Locale, `/${string}`>>;
  lastModified: string;
};

function entry(
  siteUrl: string,
  { canonical, languages }: ReturnType<typeof localeAlternates>,
  lastModified?: string,
): MetadataRoute.Sitemap[number] {
  return {
    url: absolute(siteUrl, canonical),
    ...(lastModified && { lastModified }),
    alternates: {
      languages: Object.fromEntries(
        Object.entries(languages).map(([language, path]) => [
          language,
          absolute(siteUrl, path),
        ]),
      ),
    },
  };
}

/**
 * One entry per page and locale, each listing every language version + x-default;
 * then one entry per blog post, listing only the languages it is written in.
 */
export function buildSitemap(
  siteUrl: string,
  pages: readonly `/${string}`[],
  posts: readonly SitemapPost[] = [],
): MetadataRoute.Sitemap {
  return [
    ...pages.flatMap((page) =>
      routing.locales.map((locale) =>
        entry(siteUrl, localeAlternates(locale, page)),
      ),
    ),
    ...posts.map(({ locale, path, paths, lastModified }) =>
      entry(siteUrl, localeAlternates(locale, path, paths), lastModified),
    ),
  ];
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
