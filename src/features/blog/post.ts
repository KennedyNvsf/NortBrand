import { routing, type Locale } from "@/i18n/routing";
import type { BLOG_POST_QUERY_RESULT } from "@/lib/sanity/sanity.types";

import { blockText } from "./table-of-contents";

/*
 * Pure rules for the post page (#61), kept out of the components so they are tested on
 * their own.
 */

/** A post as its page renders it (BLOG_POST_QUERY found a document). */
export type BlogPost = NonNullable<BLOG_POST_QUERY_RESULT>;

/** Words per minute for the "8 min read" line: a common figure for screen reading. */
const WORDS_PER_MINUTE = 200;

type Block = { _type?: string; children?: { text?: string }[] };

/** Minutes to read a post's text blocks (images ignored), rounded up, at least 1. */
export function readingMinutes(body: readonly Block[] | null | undefined) {
  const words = (body ?? [])
    .filter((block) => block._type === "block")
    .map((block) => blockText(block))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

type Translation = { language: string | null; slug: string } | null;

/**
 * Where each language's version of a post lives, for the language switcher: the
 * translation when one exists, otherwise that language's blog listing, so switching
 * language never lands on a 404. The post's own language always maps to itself (the
 * plugin's metadata may be missing for a post that was never translated).
 */
export function postPaths(
  locale: Locale,
  slug: string,
  translations: readonly Translation[] | null | undefined,
): Record<Locale, `/${string}`> {
  const path = (language: Locale): `/${string}` => {
    if (language === locale) return `/blog/${slug}`;
    const translation = translations?.find(
      (entry) => entry?.language === language,
    );
    return translation ? `/blog/${translation.slug}` : "/blog";
  };
  // Spelled out per locale, so adding a locale to routing.ts is a type error here.
  return { en: path("en"), pt: path("pt") };
}

/** The languages a post is really written in (hreflang lists only those). */
export function translatedLocales(
  locale: Locale,
  translations: readonly Translation[] | null | undefined,
): Locale[] {
  return routing.locales.filter(
    (language) =>
      language === locale ||
      translations?.some((entry) => entry?.language === language),
  );
}
