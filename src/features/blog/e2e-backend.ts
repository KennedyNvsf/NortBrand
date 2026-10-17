import type { Locale } from "@/i18n/routing";
import type {
  BLOG_CATEGORIES_QUERY_RESULT,
  BLOG_LATEST_QUERY_RESULT,
} from "@/lib/sanity/sanity.types";

import { pageRange, type ListingParams } from "./listing-params";

/*
 * Blog fixtures for Playwright (#60), used only when `isFakeBackendEnabled()`
 * (src/lib/e2e-backend.ts): CI has no Sanity project, and e2e must not depend on content
 * an editor can change. The filter, search, sort and paging rules mirror the GROQ in
 * queries.ts, so the listing behaves the same with fixtures and with Sanity.
 *
 * 10 English posts (page 2 exists), 3 Portuguese, no covers (the card's placeholder).
 */

export type BlogCard = BLOG_LATEST_QUERY_RESULT["posts"][number];

const categoryNames: Record<string, Record<Locale, string>> = {
  design: { en: "Web Design", pt: "Web Design" },
  branding: { en: "Branding", pt: "Marca" },
  content: { en: "Content", pt: "Conteúdo" },
};

const titles: [string, string, string][] = [
  [
    "Why Your Website Should Work Like a Product, Not a Brochure",
    "design",
    "2026-09-29",
  ],
  ["5 Signs Your Brand Needs a Refresh", "branding", "2026-09-24"],
  ["How to Choose Colors That Actually Convert", "design", "2026-09-18"],
  ["The Real Cost of a Slow Website", "design", "2026-09-12"],
  ["Content That Converts for Local Businesses", "content", "2026-09-05"],
  ["Why Consistency Beats Perfection in Social Media", "content", "2026-08-28"],
  [
    "What Happens After Launch? A Guide to Website Maintenance",
    "design",
    "2026-08-20",
  ],
  ["The Anatomy of a High-Converting Landing Page", "design", "2026-08-12"],
  ["SEO Basics Every Local Business Should Know", "content", "2026-08-04"],
  ["Brand Voice for Small Teams", "branding", "2026-07-27"],
];

function card(
  language: Locale,
  index: number,
  [title, category, date]: [string, string, string],
): BlogCard {
  return {
    _id: `e2e-${language}-${index + 1}`,
    title,
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    excerpt: `Test excerpt for “${title}”.`,
    publishedAt: `${date}T09:00:00.000Z`,
    cover: { asset: null, crop: null, hotspot: null, alt: "" },
    category: {
      slug: category,
      name: categoryNames[category]?.[language] ?? category,
    },
    author: { name: "NortBrand Team" },
  };
}

const posts: Record<Locale, BlogCard[]> = {
  en: titles.map((entry, index) => card("en", index, entry)),
  pt: titles
    .slice(0, 3)
    .map((entry, index) =>
      card("pt", index, [`[PT] ${entry[0]}`, entry[1], entry[2]]),
    ),
};

/** GROQ's `[title, excerpt] match ["bra*", …]`: every word prefixes a word in either. */
function matches(post: BlogCard, q: string): boolean {
  const words = q
    .replace(/\*/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const haystack = `${post.title} ${post.excerpt}`
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.every((word) =>
    haystack.some((token) => token.startsWith(word)),
  );
}

export function fakeFeatured(language: Locale): BlogCard | null {
  return posts[language][0] ?? null;
}

export function fakeListing(
  language: Locale,
  params: ListingParams,
  excludeId: string,
): BLOG_LATEST_QUERY_RESULT {
  const listed = posts[language]
    .filter((post) => post._id !== excludeId)
    .filter(
      (post) => !params.category || post.category.slug === params.category,
    )
    .filter((post) => !params.q || matches(post, params.q))
    .sort((a, b) =>
      params.sort === "oldest"
        ? a.publishedAt.localeCompare(b.publishedAt)
        : b.publishedAt.localeCompare(a.publishedAt),
    );
  const { start, end } = pageRange(params.page);
  return { total: listed.length, posts: listed.slice(start, end) };
}

export function fakeCategories(language: Locale): BLOG_CATEGORIES_QUERY_RESULT {
  return Object.entries(categoryNames).map(([slug, names]) => ({
    slug,
    name: names[language],
  }));
}
