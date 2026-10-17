import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";

/*
 * Post dates in the page's language, on Lisbon time (CLAUDE.md: store UTC, show Lisbon
 * time). Cards show the month ("Sep 2026"), the featured article and posts the day
 * ("Sep 29, 2026", "29 de setembro de 2026"). Portuguese spells the month out: pt-PT's
 * short form is numeric ("09/2026"), which reads as a code, not a date.
 */
const intlLocale: Record<Locale, string> = { en: "en-US", pt: "pt-PT" };
const monthStyle: Record<Locale, "short" | "long"> = {
  en: "short",
  pt: "long",
};

export function formatPostDate(
  locale: Locale,
  iso: string,
  precision: "month" | "day",
) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: site.timeZone,
    year: "numeric",
    month: monthStyle[locale],
    ...(precision === "day" && { day: "numeric" }),
  }).format(new Date(iso));
}
