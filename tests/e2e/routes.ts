import { routing, type Locale } from "../../src/i18n/routing";

/**
 * Every page under /[locale], as a locale-independent path. The shared page harness
 * (pages.spec.ts) runs each entry in every locale, so adding a page means adding one
 * line here.
 */
export const routes = [
  { name: "Home", path: "/" },
] as const satisfies readonly {
  name: string;
  path: `/${string}`;
}[];

export const locales = routing.locales;

export function localizedPath(locale: Locale, path: `/${string}`): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
