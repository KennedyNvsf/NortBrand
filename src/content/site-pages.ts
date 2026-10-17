import { legalDocuments } from "./legal";

/**
 * Every indexable page, as a locale-independent path. The sitemap lists each one in
 * every locale with hreflang alternates. Add a page here when it ships; the 404, the
 * Studio and the noindex newsletter pages stay out. Blog posts join in #62.
 */
export const sitePages = [
  "/",
  "/services",
  "/about",
  "/contact",
  "/blog",
  legalDocuments.privacy.path,
  legalDocuments.terms.path,
] as const satisfies readonly `/${string}`[];

export type SitePage = (typeof sitePages)[number];
