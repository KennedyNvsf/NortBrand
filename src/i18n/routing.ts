import { defineRouting } from "next-intl/routing";

/**
 * ADR-006. Every route lives under /[locale]. Only the bare `/` is negotiated (see
 * src/proxy.ts): preference cookie, then Accept-Language, then `pt`. Prefixed URLs are
 * never redirected.
 */
export const routing = defineRouting({
  locales: ["en", "pt"],
  defaultLocale: "pt",
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
  // hreflang is emitted as <link> tags per page (see src/i18n/metadata.ts), because
  // the proxy only runs on `/` and could not add Link headers everywhere.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

/**
 * Each language named in itself (endonyms). Never translated: a Portuguese speaker on
 * the English site must still find "Português".
 */
export const localeNames = {
  en: "English",
  pt: "Português",
} as const satisfies Record<Locale, string>;
