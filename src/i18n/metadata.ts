import type { Metadata } from "next";

import { routing, type Locale } from "./routing";

/**
 * Canonical URL and hreflang alternates for a locale-independent path such as "/" or
 * "/services". Relative URLs resolve against `metadataBase` (NEXT_PUBLIC_SITE_URL).
 *
 * x-default points at the language-negotiating root for the home page, and at the
 * default locale for every other page (only the bare `/` is negotiated, ADR-006).
 *
 * `paths` is for pages whose address differs per language (a blog post: one slug per
 * language). Only the languages it lists get an hreflang, and x-default follows the
 * default locale's version, or this page's when there is none.
 */
export type LocaleAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

export function localeAlternates(
  locale: Locale,
  path: `/${string}`,
  paths?: Partial<Record<Locale, `/${string}`>>,
): LocaleAlternates {
  if (paths) {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) {
      const own = paths[l];
      if (own) languages[l] = `/${l}${own}`;
    }
    languages["x-default"] =
      languages[routing.defaultLocale] ?? `/${locale}${path}`;
    return { canonical: `/${locale}${path}`, languages };
  }
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${suffix}`;
  languages["x-default"] =
    path === "/" ? "/" : `/${routing.defaultLocale}${suffix}`;

  return { canonical: `/${locale}${suffix}`, languages };
}

/** Open Graph locale codes (language_TERRITORY): a Portuguese studio, so en_GB/pt_PT. */
export const openGraphLocales = {
  en: "en_GB",
  pt: "pt_PT",
} as const satisfies Record<Locale, string>;

/**
 * The share image (app/[locale]/opengraph-image.tsx). A page that sets its own
 * `openGraph` replaces the one inherited from the layout, image included, so
 * pageMetadata references the image explicitly.
 */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function shareImagePath(locale: Locale): `/${string}` {
  return `/${locale}/opengraph-image`;
}

type PageMetadataInput = {
  locale: Locale;
  path: `/${string}`;
  /**
   * The page's own title; the layout template adds " · NortBrand". Pass
   * `{ absolute }` for a title used as is (the home page).
   */
  title: string | { absolute: string };
  description: string;
  siteName: string;
  /** Vercel preview build: noindex (see src/lib/seo/deployment.ts). */
  preview: boolean;
  /** The page's path per language, when it differs (see localeAlternates). */
  paths?: Partial<Record<Locale, `/${string}`>>;
  /** The page's own share image (a blog cover), instead of the site's. Absolute URL. */
  image?: { url: string; width: number; height: number; alt: string };
  /** Open Graph `article` fields (blog posts); the type becomes "article". */
  article?: {
    publishedTime: string;
    modifiedTime: string;
    authors: readonly string[];
    section?: string;
  };
};

/** The optional per-page additions, for localizedPageMetadata to pass through. */
export type PageMetadataExtras = Pick<PageMetadataInput, "image" | "article">;

/**
 * Everything a page needs for search and sharing (brief, "SEO"): title, description,
 * canonical and hreflang alternates, Open Graph and Twitter card fields, and noindex
 * on preview deployments, plus the share image (see SHARE_IMAGE_SIZE).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
  preview,
  paths,
  image: ownImage,
  article,
}: PageMetadataInput): Metadata {
  const alternates = localeAlternates(locale, path, paths);
  const shareTitle =
    typeof title === "string" ? `${title} · ${siteName}` : title.absolute;
  const image = ownImage ?? {
    url: shareImagePath(locale),
    ...SHARE_IMAGE_SIZE,
    type: "image/png",
    alt: siteName,
  };
  // Only languages the page really exists in (a post may have no translation).
  const otherLocales = routing.locales.filter(
    (other) => other !== locale && (!paths || paths[other]),
  );

  return {
    title,
    description,
    alternates,
    openGraph: {
      ...(article
        ? { type: "article", ...article, authors: [...article.authors] }
        : { type: "website" }),
      siteName,
      title: shareTitle,
      description,
      url: alternates.canonical,
      locale: openGraphLocales[locale],
      alternateLocale: otherLocales.map((other) => openGraphLocales[other]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [image],
    },
    ...(preview && { robots: { index: false, follow: false } }),
  };
}
