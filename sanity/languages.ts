/**
 * The blog's languages, in the shapes the two translation plugins expect. They must
 * match the site's locales (src/i18n/routing.ts); languages.test.ts keeps them equal.
 */
export const languages = [
  { id: "en", title: "English" },
  { id: "pt", title: "Português" },
] as const;

export type Language = (typeof languages)[number]["id"];
