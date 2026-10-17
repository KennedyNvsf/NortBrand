import { routing, type Locale } from "../../src/i18n/routing";

/**
 * Every page under /[locale], as a locale-independent path. The shared page harness
 * (pages.spec.ts) runs each entry in every locale, so adding a page means adding one
 * line here. `notFound` entries are unbuilt paths that must serve the designed 404:
 * the harness expects a 404 status and noindex instead of canonical and hreflang.
 * `noindex` entries are real pages that must stay out of search (the newsletter link
 * pages): a 200 status, noindex, and no canonical or hreflang.
 */
export const routes = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Privacy Policy", path: "/legal/privacy" },
  { name: "Terms of Use", path: "/legal/terms" },
  { name: "Newsletter confirm", path: "/newsletter/confirm", noindex: true },
  {
    name: "Newsletter unsubscribe",
    path: "/newsletter/unsubscribe",
    noindex: true,
  },
  { name: "Blog", path: "/blog" },
  { name: "404 (unknown page)", path: "/no-such-page", notFound: true },
] as const satisfies readonly {
  name: string;
  path: `/${string}`;
  notFound?: true;
  noindex?: true;
}[];

export const locales = routing.locales;

export function localizedPath(locale: Locale, path: `/${string}`): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
