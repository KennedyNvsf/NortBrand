import type { Metadata } from "next";

import { routing, type Locale } from "./routing";

/**
 * Canonical URL and hreflang alternates for a locale-independent path such as "/" or
 * "/services". Relative URLs resolve against `metadataBase` (NEXT_PUBLIC_SITE_URL).
 *
 * x-default points at the language-negotiating root for the home page, and at the
 * default locale for every other page (only the bare `/` is negotiated, ADR-006).
 */
export function localeAlternates(
  locale: Locale,
  path: `/${string}`,
): NonNullable<Metadata["alternates"]> {
  const suffix = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${suffix}`;
  languages["x-default"] =
    path === "/" ? "/" : `/${routing.defaultLocale}${suffix}`;

  return { canonical: `/${locale}${suffix}`, languages };
}
